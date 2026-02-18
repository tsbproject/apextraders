

### 📡 API Endpoint Documentation

#### **1. Settle Position**

* **Method:** `PATCH` or `POST`
* **Endpoint:** `/api/trades/close/:id` (PATCH) or `/api/trades/close` (POST)
* **Body:**
```json
{
  "exitPrice": 52450.50,
  "pnlPercentage": 5.25,
  "tournamentId": "weekly-apex-challenge"
}

```


* **Logic:** Updates trade to `CLOSED`  Triggers `syncUserLeaderboardStats`  Updates user rank tier.

#### **2. Fetch User History**

* **Method:** `GET`
* **Endpoint:** `/api/trades/history?userId=user_1`
* **Response:** Array of `CLOSED` trades sorted by `createdAt` DESC.

#### **3. Sync Leaderboard (Internal)**

* **Function:** `syncUserLeaderboardStats(userId, tournamentId)`
* **Operation:** Atomic aggregation. It sums all PnL for the user in that specific tournament and updates the `Participant` table.

---

### 🏆 Rank Tier Reference

Based on the logic we implemented in the sync utility:

| Tier | PnL Requirement |
| --- | --- |
| **DIAMOND** |  |
| **GOLD** |  |
| **SILVER** |  |
| **BRONZE** |  |


