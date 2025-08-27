// Biometric service integration for external hardware over HTTP or WebSocket
// Configuration via environment variables:
// - VITE_BIOMETRIC_HTTP_URL (e.g., https://device.local/api/verify)
// - VITE_BIOMETRIC_WS_URL   (e.g., wss://device.local/biometric)

const HTTP_URL = import.meta.env.VITE_BIOMETRIC_HTTP_URL || null;
const WS_URL = import.meta.env.VITE_BIOMETRIC_WS_URL || null;

function timeoutPromise(ms) {
	return new Promise((_, reject) => setTimeout(() => reject(new Error("Biometric verification timed out")), ms));
}

async function verifyBiometricOverHttp(voterId, options) {
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs || 30000;
	const body = JSON.stringify({ voterId });
	const headers = { "Content-Type": "application/json" };

	const request = fetch(HTTP_URL, {
		method: "POST",
		headers,
		body,
		signal: controller.signal
	}).then(async (res) => {
		if (!res.ok) throw new Error(`Biometric HTTP error ${res.status}`);
		const data = await res.json();
		return { success: Boolean(data.success), payload: data };
	});

	try {
		const result = await Promise.race([request, timeoutPromise(timeoutMs)]);
		controller.abort();
		return result;
	} catch (err) {
		controller.abort();
		throw err;
	}
}

async function verifyBiometricOverWs(voterId, options) {
	const timeoutMs = options?.timeoutMs || 30000;

	return new Promise((resolve, reject) => {
		let settled = false;
		let timer;
		try {
			const ws = new WebSocket(WS_URL);
			ws.onopen = () => {
				ws.send(JSON.stringify({ type: "verify", voterId }));
				timer = setTimeout(() => {
					if (!settled) {
						settled = true;
						ws.close();
						reject(new Error("Biometric verification timed out"));
					}
				}, timeoutMs);
			};
			ws.onmessage = (event) => {
				if (settled) return;
				try {
					const data = JSON.parse(event.data);
					if (data.type === "verification_result" && data.voterId === voterId) {
						settled = true;
						clearTimeout(timer);
						ws.close();
						return resolve({ success: Boolean(data.success), payload: data });
					}
				} catch (e) {
					// ignore non-JSON frames
				}
			};
			ws.onerror = (e) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				try { ws.close(); } catch {}
				reject(new Error("Biometric WebSocket error"));
			};
			ws.onclose = () => {
				if (!settled) {
					settled = true;
					clearTimeout(timer);
					reject(new Error("Biometric WebSocket closed before result"));
				}
			};
		} catch (err) {
			reject(err);
		}
	});
}

export async function verifyBiometric(voterId, options = {}) {
	if (!voterId || voterId.trim().length < 1) {
		throw new Error("Voter ID is required for biometric verification");
	}

	// Prefer WebSocket if configured, else HTTP
	if (WS_URL) {
		return verifyBiometricOverWs(voterId, options);
	}
	if (HTTP_URL) {
		return verifyBiometricOverHttp(voterId, options);
	}

	// Fallback: no configured endpoints -> reject to enforce real hardware usage
	throw new Error("Biometric endpoints not configured. Set VITE_BIOMETRIC_HTTP_URL or VITE_BIOMETRIC_WS_URL in votingdapp/.env");
}

export function getBiometricConfig() {
	return { httpUrl: HTTP_URL, wsUrl: WS_URL };
}


