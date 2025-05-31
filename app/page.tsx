"use client"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-white">
      <div className="flex items-center justify-center mb-8">
        <img src="/images/berry-logo.png" alt="Berry" className="h-12" />
      </div>

      <div className="flex flex-col items-center">
        <div className="w-[120px] h-[120px] rounded-full border border-black flex items-center justify-center text-gray-400 mb-4">
          🐶
        </div>
        <h1 className="text-3xl font-bold">Welcome to Berry</h1>
        <p className="text-gray-600 mt-2">Dog Activity Tracker</p>
      </div>

      <div className="mt-8 w-full max-w-md text-center">
        <p className="text-gray-500">Track your dog's daily activities with your family</p>
      </div>
    </main>
  )
}
