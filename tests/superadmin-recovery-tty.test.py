"""Run only with the disposable local database prepared by the test operator.
Never logs transcripts or secret values, including when an assertion fails.
"""
import errno
import os
from pathlib import Path
import pty
import secrets
import select
import signal
import subprocess
import tempfile
import termios
import time
from urllib.parse import urlparse

url = os.environ['RECOVERY_TEST_DATABASE_URL']
target = urlparse(url)
if target.hostname != '127.0.0.1' or not target.path.startswith('/apex_recovery_test_'):
    raise RuntimeError('Refusing non-isolated database')
account = os.environ['RECOVERY_TEST_ACCOUNT_ID']
node = os.environ['RECOVERY_TEST_NODE']
script = str(Path('scripts/recover-superadmin.ts').resolve())
identity = f'{target.hostname}:{target.port}{target.path}'
new_password = secrets.token_hex(24)
passphrase = secrets.token_hex(32)
private = tempfile.TemporaryDirectory(prefix='apex-recovery-tty-')
backup = str(Path(private.name) / 'rollback.enc')

def run_tty(action, steps, success, extra=None, expected_exit=0):
    args = [node, '--import', 'tsx', script, action, '--account-id', account]
    if action != 'verify':
        args += ['--apply', '--backup', backup]
    args += extra or []
    pid, fd = pty.fork()
    if pid == 0:
        os.execvpe(node, args, os.environ.copy())
    transcript = b''
    pending = b''
    def read_until(expected):
        nonlocal transcript, pending
        end = time.monotonic() + 20
        while expected not in pending:
            if time.monotonic() > end:
                raise RuntimeError('CLI prompt timed out')
            if select.select([fd], [], [], 0.25)[0]:
                try:
                    data = os.read(fd, 65536)
                except OSError as error:
                    if error.errno == errno.EIO:
                        raise RuntimeError('CLI closed before expected prompt') from None
                    raise
                if not data:
                    raise RuntimeError('CLI closed before expected prompt')
                transcript += data
                pending += data
        pending = pending.split(expected, 1)[1]
    try:
        for expected, reply in steps:
            read_until(expected.encode())
            os.write(fd, reply.encode() + b'\r')
        read_until(success.encode())
        _, status = os.waitpid(pid, 0)
        pid = None
        if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != expected_exit:
            raise RuntimeError('CLI did not exit successfully')
        # Never include transcript or values in assertion output.
        if not termios.tcgetattr(fd)[3] & termios.ECHO:
            raise RuntimeError('Terminal echo was not restored')
        hidden_inputs = [reply for label, reply in steps if 'hidden' in label]
        for hidden in [url, target.password or '', new_password, passphrase, *hidden_inputs]:
            if hidden and hidden.encode() in transcript:
                raise RuntimeError('Sensitive input was echoed')
    finally:
        os.close(fd)
        if pid is not None:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            os.waitpid(pid, 0)

try:
    run_tty('recover', [
        ('Target PostgreSQL URL (hidden): ', url),
        ('to confirm: ', f'RECOVER {account} {identity}'),
        ('New password (hidden): ', new_password),
        ('Confirm new password (hidden): ', new_password),
        ('Independent backup passphrase (hidden): ', passphrase),
        ('Confirm backup passphrase (hidden): ', passphrase),
    ], 'Committed: exactly one SUPER_ADMIN passwordHash updated.')
    run_tty('verify', [
        ('Target PostgreSQL URL (hidden): ', url),
        ('to confirm: ', f'VERIFY {account} {identity}'),
        ('Password to verify (hidden): ', new_password),
    ], 'Verified: exact SUPER_ADMIN account and password match.')
    run_tty('rollback', [
        ('Target PostgreSQL URL (hidden): ', url),
        ('to confirm: ', f'ROLLBACK {account} {identity}'),
        ('Independent backup passphrase (hidden): ', passphrase),
    ], 'Committed: exactly one passwordHash restored.')
    run_tty('verify', [('Target PostgreSQL URL (hidden): ', url),
            ('to confirm: ', 'CANCEL')], 'Confirmation did not match.', expected_exit=1)
    run_tty('verify', [('Target PostgreSQL URL (hidden): ', url + '?host=example.invalid')],
            'Only single sslmode and channel_binding URL parameters are accepted.', expected_exit=1)
    remote = f'postgresql://recovery_test:{target.password}@example.invalid/apex_recovery_test_remote?sslmode=require'
    run_tty('verify', [('Target PostgreSQL URL (hidden): ', remote)],
            'Remote connections require --allow-remote and sslmode=verify-full',
            extra=['--allow-remote'], expected_exit=1)
    run_tty('recover', [
        ('Target PostgreSQL URL (hidden): ', url),
        ('to confirm: ', f'RECOVER {account} {identity}'),
        ('New password (hidden): ', new_password),
        ('Confirm new password (hidden): ', secrets.token_hex(24)),
    ], 'Passwords did not match.', expected_exit=1)
    run_tty('verify', [('Target PostgreSQL URL (hidden): ', '\x03')],
            'Cancelled.', expected_exit=1)
    result = subprocess.run([node, '--import', 'tsx', script, 'verify', '--account-id', account],
                            input=b'', stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 1 or b'interactive terminal' not in result.stderr:
        raise RuntimeError('Non-TTY input was not refused')
    print('PASS: real PTY recovery, read-only verification, guarded rollback, hidden input, echo restoration, cancellation, mismatch, routing/TLS guards, and non-TTY rejection.')
finally:
    private.cleanup()
