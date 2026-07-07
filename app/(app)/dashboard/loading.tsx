export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="h-8 bg-gray-200 rounded-lg w-40 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-56 mb-6 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="h-3 bg-gray-100 rounded w-16 mb-2 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-64 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-64 animate-pulse" />
      </div>
    </div>
  )
}
