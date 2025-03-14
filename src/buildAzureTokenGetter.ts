// Copyright MFB Technologies, Inc.

import {
  PublicClientApplication,
  Configuration,
  InteractiveRequest,
  InteractionRequiredAuthError,
  AuthError
} from "@azure/msal-node"
import open from "open"
import {
  PersistenceCreator,
  PersistenceCachePlugin,
  Environment
} from "@azure/msal-node-extensions"
import path from "path"

export async function buildAzureTokenGetter(args: {
  tenantId: string
  clientId: string
  apiScope: string
  cacheConfiguration?: {
    serviceName: string
    accountName: string
  }
}): Promise<{ getAuthToken: () => Promise<string> }> {
  const MS_AUTHORITY = `https://login.microsoftonline.com/${args.tenantId}`

  const msalConfig: Configuration = {
    auth: {
      clientId: args.clientId,
      authority: MS_AUTHORITY
    }
  }

  if (args.cacheConfiguration) {
    const rootDir = Environment.getUserRootDirectory()
    if (!rootDir) {
      throw new Error("Unexpectedly unable to get user's home directory")
    }
    const cachePath = path.join(rootDir, ".msal-node-persist-cache.json")

    const persistence = await PersistenceCreator.createPersistence({
      cachePath,
      serviceName: args.cacheConfiguration.serviceName,
      accountName: args.cacheConfiguration.accountName,
      usePlaintextFileOnLinux: false
    })

    msalConfig.cache = {
      cachePlugin: new PersistenceCachePlugin(persistence)
    }
  }

  const pca = new PublicClientApplication(msalConfig)

  const getToken = async (): Promise<string> => {
    const interactiveRequest: InteractiveRequest = {
      scopes: [args.apiScope],
      openBrowser: async url => {
        await open(url)
      }
    }

    const accountResult = await pca.getAllAccounts()

    const account = accountResult[0]

    if (!account) {
      console.log(
        "No account present. Attempting interactive authentication..."
      )
      if (args.cacheConfiguration) {
        console.log(
          "If this is your first time running the tool, you may also be prompted in your GUI to create a secure cache password."
        )
      }
      const result = await pca.acquireTokenInteractive(interactiveRequest)
      if (!result.account) {
        throw new Error("Unexpectedly did not obtain account information")
      }
      return result.accessToken
    }

    try {
      const result = await pca.acquireTokenSilent({
        account,
        scopes: [args.apiScope]
      })
      return result.accessToken
    } catch (err) {
      const isInteractionError = err instanceof InteractionRequiredAuthError
      const isTokenError =
        err instanceof AuthError &&
        ["invalid_grant", "interaction_required"].includes(err.errorCode)
      if (isInteractionError || isTokenError) {
        console.log(
          `Received error "${err.errorCode}: ${err.errorMessage}". Attempting interactive authentication...`
        )
        const result = await pca.acquireTokenInteractive(interactiveRequest)
        return result.accessToken
      }
      throw err
    }
  }

  return {
    getAuthToken: getToken
  }
}
