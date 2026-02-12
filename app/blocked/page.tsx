export default function BlockedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Access Restricted</h1>
      <p className="mt-4 text-lg text-gray-700">
        Service not available in your region due to local regulations requiring ID verification.
      </p>
    </main>
  );
}
