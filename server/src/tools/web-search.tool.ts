import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ToolRegistry } from './tool-registry'

@Injectable()
export class WebSearchTool {
  constructor(
    private configService: ConfigService,
    private registry: ToolRegistry,
  ) {
    this.register()
  }

  private register() {
    const apiKey = this.configService.get('TAVILY_API_KEY')
    if (!apiKey) return

    this.registry.register({
      name: 'web_search',
      description: 'Search the web for current information. Use this when you need real-time data, news, or facts.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
      execute: async (args: { query: string }) => {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: args.query,
            max_results: 6,
            include_answer: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`)
        }

        const data = await response.json()
        const results = (data.results || []).map((r: any) =>
          `### ${r.title}\n${r.content}\nSource: ${r.url}`
        ).join('\n\n')

        return {
          content: data.answer
            ? `**Answer:** ${data.answer}\n\n**Sources:**\n${results}`
            : results || 'No results found.',
        }
      },
    })
  }
}
