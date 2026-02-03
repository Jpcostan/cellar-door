export interface RetrievedMemory {
  items: string[];
  tokensUsed: number;
}

export async function retrieveMemory(task: string, budgetTokens: number): Promise<RetrievedMemory> {
  void task;
  void budgetTokens;
  return { items: [], tokensUsed: 0 };
}
