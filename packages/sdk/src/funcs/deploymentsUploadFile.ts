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
  UploadFileRequest,
  UploadFileRequest$outboundSchema,
  UploadFileResponseBody,
  UploadFileResponseBody$inboundSchema,
} from "../models/operations/uploadfile.js";
import { Result } from "../types/fp.js";

/**
 * Upload Deployment Files
 *
 * @remarks
 * Before you create a deployment you need to upload the required files for that deployment. To do it, you need to first upload each file to this endpoint. Once that's completed, you can create a new deployment with the uploaded files. The file content must be placed inside the body of the request. In the case of a successful response you'll receive a status code 200 with an empty body.
 */
export async function deploymentsUploadFile(
  client: VercelCore,
  request: UploadFileRequest,
  options?: RequestOptions,
): Promise<
  Result<
    UploadFileResponseBody,
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
    (value) => UploadFileRequest$outboundSchema.parse(value),
    "Input validation failed",
  );
  if (!parsed.ok) {
    return parsed;
  }
  const payload = parsed.value;
  const body = null;

  const path = pathToFunc("/v2/files")();

  const query = encodeFormQuery({
    "slug": payload.slug,
    "teamId": payload.teamId,
  });

  const headers = new Headers({
    Accept: "application/json",
    "Content-Length": encodeSimple(
      "Content-Length",
      payload["Content-Length"],
      { explode: false, charEncoding: "none" },
    ),
    "x-now-digest": encodeSimple("x-now-digest", payload["x-now-digest"], {
      explode: false,
      charEncoding: "none",
    }),
    "x-now-size": encodeSimple("x-now-size", payload["x-now-size"], {
      explode: false,
      charEncoding: "none",
    }),
    "x-vercel-digest": encodeSimple(
      "x-vercel-digest",
      payload["x-vercel-digest"],
      { explode: false, charEncoding: "none" },
    ),
  });

  const secConfig = await extractSecurity(client._options.bearerToken);
  const securityInput = secConfig == null ? {} : { bearerToken: secConfig };
  const context = {
    operationID: "uploadFile",
    oAuth2Scopes: [],
    securitySource: client._options.bearerToken,
  };
  const requestSecurity = resolveGlobalSecurity(securityInput);

  const requestRes = client._createRequest(context, {
    security: requestSecurity,
    method: "POST",
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
    errorCodes: ["400", "401", "403", "4XX", "5XX"],
    retryConfig: options?.retries
      || client._options.retryConfig,
    retryCodes: options?.retryCodes || ["429", "500", "502", "503", "504"],
  });
  if (!doResult.ok) {
    return doResult;
  }
  const response = doResult.value;

  const [result] = await M.match<
    UploadFileResponseBody,
    | SDKError
    | SDKValidationError
    | UnexpectedClientError
    | InvalidRequestError
    | RequestAbortedError
    | RequestTimeoutError
    | ConnectionError
  >(
    M.json(200, UploadFileResponseBody$inboundSchema),
    M.fail([400, 401, 403, "4XX", "5XX"]),
  )(response);
  if (!result.ok) {
    return result;
  }

  return result;
}
