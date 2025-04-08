import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { extractMessage, parseError } from "./parseError";
import { ppplbot } from "./logbots";
import { sleep } from "../utils";

export async function fetchWithTimeout(
    url: string,
    options: AxiosRequestConfig & { bypassUrl?: string } = {},
    maxRetries = 3
): Promise<AxiosResponse | undefined> {
    if (!url) {
        console.error('URL is empty');
        return undefined;
    }

    options.timeout = options.timeout || 30000; // Set default timeout to 30 seconds
    options.method = options.method || "GET";
    let lastError: Error | null = null;

    console.log(`Trying: ${url}`);

    try {
        const parsedUrl = new URL(url);
        var host = parsedUrl.host;
        var endpoint = parsedUrl.pathname + parsedUrl.search;
    } catch (error) {
        console.error(`Invalid URL: ${url}`);
        return undefined;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const currentTimeout = options.timeout + (attempt * 5000); // Add 5 seconds per retry
        const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

        try {
            const response = await axios({
                ...options,
                url,
                signal: controller.signal,
                maxRedirects: 5,
                timeout: currentTimeout, // Use the increased timeout for axios request too
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            lastError = error instanceof Error ? error : new Error(String(error));
            const parsedError = parseError(error, `host: ${host}\nendpoint:${endpoint}`, false);

            const message = extractMessage(parsedError);
            const isTimeout = axios.isAxiosError(error) &&
                (error.code === "ECONNABORTED" ||
                    message.includes("timeout") ||
                    parsedError.status === 408);


            if (parsedError.status === 403 || parsedError.status === 495) {
                notify(`Attempting bypass for`, { message: `${process.env.clientId}  host=${host}\nendpoint=${endpoint}` });
                try {
                    const bypassResponse = await makeBypassRequest(url, options);
                    notify(`Successfully executed 403 request`, { message: `${process.env.clientId} host=${host}\nendpoint=${endpoint}` });
                    return bypassResponse;
                } catch (bypassError) {
                    const errorDetails = extractMessage(parseError(bypassError, `host: ${host}\nendpoint:${endpoint}`, false));
                    notify(`Bypass attempt failed`, { message: `host=${host}\nendpoint=${endpoint}\n${errorDetails.length < 250 ? `msg: ${errorDetails}` : "msg: Message too long"}` });
                    return undefined;
                }
            } else {
                if (isTimeout) {
                    console.error(`Request timeout (${options.timeout}ms): ${url}`);
                    notify(`Timeout on attempt ${attempt}`, {
                        message: `${process.env.clientId} host=${host}\nendpoint=${endpoint}\ntimeout=${options.timeout}ms`,
                        status: 408
                    });
                } else {
                    notify(`Attempt ${attempt} failed`, {
                        message: `${process.env.clientId} host=${host}\nendpoint=${endpoint}\n${message.length < 250 ? `msg: ${message}` : "msg: Message too long"}`,
                        status: parsedError.status
                    });
                }
            }

            if (attempt < maxRetries && (shouldRetry(error, parsedError) || isRetryableStatus(parsedError.status))) {
                const delay = calculateBackoff(attempt);
                console.log(`Retrying request (${attempt + 1}/${maxRetries}) after ${delay}ms`);
                await sleep(delay);
                continue;
            }
            return undefined;
        }
    }
    const errorData = extractMessage(parseError(lastError, `${process.env.clientId} host: ${host}\nendpoint:${endpoint}`, false));
    notify(`All ${maxRetries} retries exhausted`, { message: `${errorData.length < 250 ? `msg: ${errorData}` : "msg: Message too long"}` });
    return undefined;
}

async function makeBypassRequest(url: string, options: AxiosRequestConfig & { bypassUrl?: string }): Promise<AxiosResponse | undefined> {
    if (!options.bypassUrl && !process.env.bypassURL) {
        console.error('Bypass URL is not provided');
        throw new Error('Bypass URL is not provided');
    }

    options.bypassUrl = options.bypassUrl || `https://ravishing-perception-production.up.railway.app/execute-request`;

    const bypassAxios = axios.create({
        responseType: options.responseType || 'json',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: options.timeout || 30000
    });

    const response = await bypassAxios.post(options.bypassUrl, {
        url,
        method: options.method,
        headers: options.headers,
        data: options.data,
        params: options.params,
        responseType: options.responseType,
        timeout: options.timeout,
        followRedirects: options.maxRedirects !== 0,
        maxRedirects: options.maxRedirects
    }, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (options.responseType === 'arraybuffer' ||
        response.headers['content-type']?.includes('application/octet-stream') ||
        response.headers['content-type']?.includes('image/') ||
        response.headers['content-type']?.includes('audio/') ||
        response.headers['content-type']?.includes('video/') ||
        response.headers['content-type']?.includes('application/pdf')) {

        response.data = Buffer.from(response.data);
    }

    return response;
}

function shouldRetry(error: any, parsedError: any): boolean {
    if (axios.isAxiosError(error)) {
        const networkErrors = [
            'ETIMEDOUT',
            'ECONNABORTED',
            'ECONNREFUSED',
            'ECONNRESET',
            'ERR_NETWORK',
            'ERR_BAD_RESPONSE',
            'EHOSTUNREACH',
            'ENETUNREACH'
        ];

        if (error.code && networkErrors.includes(error.code)) {
            return true;
        }

        if (error.message?.toLowerCase().includes('timeout')) {
            return true;
        }
    }

    return isRetryableStatus(parsedError.status);
}

function notify(prefix: string, errorDetails: any) {
    const errorMessage = typeof errorDetails.message === 'string'
        ? errorDetails.message
        : JSON.stringify(errorDetails.message);

    console.error(`${prefix}\n${errorMessage.includes('ETIMEDOUT') ? 'Connection timed out' :
        errorMessage.includes('ECONNREFUSED') ? 'Connection refused' :
            extractMessage(errorDetails?.message)
        }`);

    if (errorDetails.status === 429) return;

    const notificationText = `${prefix}\n\n${errorMessage.includes('ETIMEDOUT') ? 'Connection timed out' :
        errorMessage.includes('ECONNREFUSED') ? 'Connection refused' :
            extractMessage(errorDetails?.message)
        }`;

    try {
        axios.get(`${ppplbot(process.env.httpFailuresChannel)}&text=${encodeURIComponent(notificationText)}`);
    } catch (error) {
        console.error("Failed to notify failure:", error);
    }
}

function isRetryableStatus(status: number): boolean {
    return [408, 500, 502, 503, 504, 429].includes(status);
}

function calculateBackoff(attempt: number): number {
    const minDelay = 500; // Start with 500ms
    const maxDelay = 30000; // Cap at 30 seconds
    const base = Math.min(minDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * (base * 0.2); // Add up to 20% jitter
    return Math.floor(base + jitter);
}