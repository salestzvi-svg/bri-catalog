import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="text-sm text-emerald-700">ברוכים הבאים</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-900">
          קטלוג כוונת הלב
        </h1>
        <p className="mt-3 text-gray-600">
          קטלוג דיגיטלי להזמנות מהירות ללקוחות עסקיים
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/login"
            className="block rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white"
          >
            כניסת לקוח / הרשמה
          </Link>
          <Link
            href="/admin/login"
            className="block rounded-2xl border border-emerald-200 py-4 text-lg font-semibold text-emerald-800"
          >
            כניסת מנהל
          </Link>
        </div>
      </div>
    </main>
  );
}
