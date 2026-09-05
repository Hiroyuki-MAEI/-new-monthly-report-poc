// lib/db.ts（Postgres）とlib/fileStore.ts（ローカルJSONフォールバック）の両方から
// 共通で投げる、ストレージ実装に依存しないエラー型。
export class AlreadyConfirmedError extends Error {
  constructor() {
    super("この月はすでに確定済みです。");
    this.name = "AlreadyConfirmedError";
  }
}
