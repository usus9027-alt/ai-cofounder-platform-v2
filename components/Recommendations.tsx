export default function Recommendations({ 
  recommendations, 
  onSelectRecommendation 
}: {
  recommendations: any[]
  onSelectRecommendation: (r: any) => void
}) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {recommendations.map((rec, idx) => (
        <button
          key={idx}
          onClick={() => onSelectRecommendation(rec)}
          className="block w-full text-left p-2 text-xs text-gray-600 hover:bg-gray-50 rounded"
        >
          💡 {rec.content}
        </button>
      ))}
    </div>
  )
}