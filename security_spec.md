# MyTube Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership & Verified Identity**: Every document under `/users/{userId}` and its subcollections (`subscriptions`, `likedVideos`, `watchLater`) can only be read or written by an authenticated user with `email_verified == true` and `request.auth.uid == userId`.
2. **Master Gate (Relational Sync)**: Subcollection documents (`subscriptions/{channelId}`, `likedVideos/{videoId}`, `watchLater/{videoId}`) require the parent `/users/{userId}` document to exist and have `data.uid == request.auth.uid` for single-document writes and reads.
3. **Strict Schema & Key Allowlisting**: Every entity enforces `hasAll` and `hasOnly` on document keys, explicit string `.size()` bounds, regex ID validation (`^[a-zA-Z0-9_\-]+$`), immutable `uid`, `id`, and `createdAt`, and server-timestamp enforcement (`request.time`) on `createdAt` and `updatedAt`.
4. **Zero-Leak List Queries**: Every `allow list` rule validates `resource.data.uid == request.auth.uid` and `request.auth.uid == userId` without `get()`/`exists()` inside `list`.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` writing `/users/{uid}`.
2. **Cross-User Profile Read (PII Leak)**: User A (`uid_a`) reading `/users/uid_b`.
3. **Shadow Field Injection on Create**: Writing `/users/{uid}` with extra field `isAdmin: true`.
4. **Shadow Field Injection on Update**: Updating `/users/{uid}` with `role: "admin"`.
5. **Identity Spoofing on Subcollection**: Creating `/users/uid_a/watchLater/vid1` with `uid: "uid_b"`.
6. **Path-Payload ID Mismatch**: Creating `/users/uid_a/watchLater/vid1` with `id: "vid2"`.
7. **Orphaned Subcollection Write**: Creating `/users/uid_a/watchLater/vid1` before `/users/uid_a` exists.
8. **Resource Exhaustion (1MB String)**: Updating `name` on `/users/uid_a` with a 5000-character string.
9. **ID Poisoning**: Creating `/users/uid_a/subscriptions/bad$id!` with non-alphanumeric characters.
10. **Immortal Field Mutation**: Updating `createdAt` or `uid` on `/users/uid_a`.
11. **Forged Client Timestamp**: Creating `/users/uid_a` with a past/future `createdAt` instead of `request.time`.
12. **Unauthorized List Scraping**: User A listing `/users/uid_b/likedVideos`.
