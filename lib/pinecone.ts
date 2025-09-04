// Pinecone временно отключен
export async function saveIdeaToVectorDB(idea: any) {
  console.log('Pinecone disabled, skipping save')
  return
}

export async function getIdeaRecommendations(history: any[], projectId?: string) {
  console.log('Pinecone disabled, returning empty recommendations')
  return []
}

export async function findSimilarIdeas(query: string, projectId?: string) {
  return []
}