/*
 * Code generated by Speakeasy (https://speakeasy.com). DO NOT EDIT.
 */

import { VercelCore } from "../core.js";
import { encodeFormQuery, encodeSimple } from "../lib/encodings.js";
import * as M from "../lib/matchers.js";
import { safeParse } from "../lib/schemas.js";
import { RequestOptions } from "../lib/sdks.js";
import { extractSecurity, resolveGlobalSecurity } from "../lib/security.js";
import { pathToFunc } from "../lib/url.js";
import {
  ConnectionError,
  InvalidRequestError,
  RequestAbortedError,
  RequestTimeoutError,
  UnexpectedClientError,
} from "../models/errors/httpclienterrors.js";
import { SDKError } from "../models/errors/sdkerror.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import {
  GetDeploymentRequest,
  GetDeploymentRequest$outboundSchema,
  GetDeploymentResponseBody,
  GetDeploymentResponseBody$inboundSchema,
} from "../models/operations/getdeployment.js";
import { Result } from "../types/fp.js";

/**
 * Get a deployment by ID or URL
 *
 * @remarks
 * Retrieves information for a deployment either by supplying its ID (`id` property) or Hostname (`url` property). Additional details will be included when the authenticated user or team is an owner of the deployment.
 */
export async function deploymentsGet(
  client: VercelCore,
  request: GetDeploymentRequest,
  options?: RequestOptions,
): Promise<
  Result<
    GetDeploymentResponseBody,
    | SDKError
    | SDKValidationError
    | UnexpectedClientError
    | InvalidRequestError
    | RequestAbortedError
    | RequestTimeoutError
    | ConnectionError
  >
> {
  const input = request;

  const parsed = safeParse(
    input,
    (value) => GetDeploymentRequest$outboundSchema.parse(value),
    "Input validation failed",
  );
  if (!parsed.ok) {
    return parsed;
  }
  const payload = parsed.value;
  const body = null;

  const pathParams = {
    idOrUrl: encodeSimple("idOrUrl", payload.idOrUrl, {
      explode: false,
      charEncoding: "percent",
    }),
  };

  const path = pathToFunc("/v13/deployments/{idOrUrl}#idOrUrl")(pathParams);

  const query = encodeFormQuery({
    "slug": payload.slug,
    "teamId": payload.teamId,
    "withGitRepoInfo": payload.withGitRepoInfo,
  });

  const headers = new Headers({
    Accept: "application/json",
  });

  const secConfig = await extractSecurity(client._options.bearerToken);
  const securityInput = secConfig == null ? {} : { bearerToken: secConfig };
  const context = {
    operationID: "getDeployment",
    oAuth2Scopes: [],
    securitySource: client._options.bearerToken,
  };
  const requestSecurity = resolveGlobalSecurity(securityInput);

  const requestRes = client._createRequest(context, {
    security: requestSecurity,
    method: "GET",
    path: path,
    headers: headers,
    query: query,
    body: body,
    timeoutMs: options?.timeoutMs || client._options.timeoutMs || -1,
  }, options);
  if (!requestRes.ok) {
    return requestRes;
  }
  const req = requestRes.value;

  const doResult = await client._do(req, {
    context,
    errorCodes: ["400", "403", "404", "4XX", "5XX"],
    retryConfig: options?.retries
      || client._options.retryConfig,
    retryCodes: options?.retryCodes || ["429", "500", "502", "503", "504"],
  });
  if (!doResult.ok) {
    return doResult;
  }
  const response = doResult.value;

  const [result] = await M.match<
    GetDeploymentResponseBody,
    | SDKError
    | SDKValidationError
    | UnexpectedClientError
    | InvalidRequestError
    | RequestAbortedError
    | RequestTimeoutError
    | ConnectionError
  >(
    M.json(200, GetDeploymentResponseBody$inboundSchema),
    M.fail([400, 403, 404, "4XX", "5XX"]),
  )(response);
  if (!result.ok) {
    return result;
  }

  return result;
}
