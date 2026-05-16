import { dipdup } from "@/services/config"
import { currentNetwork } from "@/services/sdk"

/**
 * Get GraphQL endpoint URL
 */
export const getGraphQLUrl = () => {
    const networkKey = currentNetwork.value === 'mainnet' ? 'mainnet' : 'testnet'
    const graphqlConfig = dipdup[networkKey];
    if (!graphqlConfig) {
        console.warn("GraphQL configuration not found for network:", networkKey)
        // Default to the common Hasura port from docker-compose
        return import.meta.env.VITE_GRAPHQL_URL || "http://localhost:8081/v1/graphql"
    }
    return graphqlConfig.graphq || graphqlConfig.graphql
}

/**
 * Execute a GraphQL query using native fetch
 */
export const executeQuery = async (query, variables = {}) => {
    const url = getGraphQLUrl()

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            variables,
        }),
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.errors) {
        console.error("GraphQL errors:", result.errors)
        throw new Error(result.errors[0]?.message || "GraphQL error")
    }

    return result.data
}
