import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'assistant-test-secret';
process.env.GEMINI_API_KEY = 'test-key-not-a-real-credential';
process.env.GEMINI_MODEL = 'gemini-test-model';
process.env.GEMINI_TIMEOUT_MS = '60000';

const { app } = await import('./index.js');
const realFetch = globalThis.fetch;
let capturedGeminiRequest;
let mockedGeminiResponse;
let mockedGeminiError;
let geminiRequestCount = 0;

globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://generativelanguage.googleapis.com/')) {
    geminiRequestCount += 1;
    capturedGeminiRequest = {
      url: String(url),
      body: JSON.parse(options.body),
    };
    if (mockedGeminiError) throw mockedGeminiError;
    if (mockedGeminiResponse) return mockedGeminiResponse;
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: '**Today’s summary**\n\n- Sales: ₹0.00 (0 transactions)\n- Expiry: 0 batches expiring today.',
          }],
        },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return realFetch(url, options);
};

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test('assistant uses role-scoped MIMS data and supports database-only fallback', async (t) => {
  t.after(async () => {
    globalThis.fetch = realFetch;
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  });

  const greetingToken = jwt.sign({ id: 'test-greeting', role: 'Staff' }, process.env.JWT_SECRET);
  const geminiCountBeforeGreeting = geminiRequestCount;
  const greetingResponse = await realFetch(`${baseUrl}/api/assistant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${greetingToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: 'hi' }),
  });
  const greeting = await greetingResponse.json();
  assert.equal(greetingResponse.status, 200);
  assert.equal(greeting.source, 'local');
  assert.match(greeting.answer, /^Hi!/);
  assert.deepEqual(greeting.toolsUsed, []);
  assert.equal(geminiRequestCount, geminiCountBeforeGreeting);

  for (const role of ['Administrator', 'Pharmacist', 'Staff']) {
    const token = jwt.sign({ id: `test-${role}`, role }, process.env.JWT_SECRET);
    const response = await realFetch(`${baseUrl}/api/assistant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "What's today's total sale and expiry?",
        history: [{ role: 'user', text: 'history must not be forwarded' }],
      }),
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.source, 'gemini');
    assert.equal(result.model, 'gemini-test-model');
    assert.equal(result.answer, 'Today’s summary\n\nSales: ₹0.00 (0 transactions)\nExpiry: 0 batches expiring today.');
    assert.doesNotMatch(result.answer, /[*_`#]|^\s*[-+]\s/m);
    assert.equal(result.toolsUsed.includes('audit'), role !== 'Staff');
    assert.equal(result.toolsUsed.includes('team'), role === 'Administrator');

    const geminiPrompt = capturedGeminiRequest.body.contents[0].parts[0].text;
    assert.match(geminiPrompt, /"sales"/);
    assert.match(geminiPrompt, /"expiry"/);
    assert.doesNotMatch(geminiPrompt, /history must not be forwarded/);
    assert.doesNotMatch(geminiPrompt, /rahul\.sharma@gmail\.com/i);
    assert.match(geminiPrompt, /plain text only/i);
    assert.equal(capturedGeminiRequest.body.generationConfig.responseMimeType, 'text/plain');
  }

  process.env.GEMINI_API_KEY = '';
  const staffToken = jwt.sign({ id: 'test-staff', role: 'Staff' }, process.env.JWT_SECRET);
  const fallbackResponse = await realFetch(`${baseUrl}/api/assistant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: "What are today's total sales?" }),
  });
  const fallback = await fallbackResponse.json();

  assert.equal(fallbackResponse.status, 200);
  assert.equal(fallback.source, 'database-fallback');
  assert.match(fallback.answer, /database records 0 sale\(s\)/);

  process.env.GEMINI_API_KEY = 'test-key-not-a-real-credential';
  mockedGeminiResponse = new Response(JSON.stringify({
    error: { message: 'Model is not available for this API version.' },
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
  const originalConsoleError = console.error;
  const loggedErrors = [];
  console.error = (message) => loggedErrors.push(String(message));
  let unsupportedQuestionResponse;
  let timeoutQuestionResponse;
  try {
    unsupportedQuestionResponse = await realFetch(`${baseUrl}/api/assistant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'Can I ask you an unsupported question?' }),
    });

    mockedGeminiResponse = null;
    mockedGeminiError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    timeoutQuestionResponse = await realFetch(`${baseUrl}/api/assistant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'Can I ask you another unsupported question?' }),
    });
  } finally {
    console.error = originalConsoleError;
  }
  const unsupportedQuestion = await unsupportedQuestionResponse.json();

  assert.equal(unsupportedQuestionResponse.status, 503);
  assert.match(loggedErrors[0], /HTTP 404 for model "gemini-test-model"/);
  assert.match(loggedErrors[0], /Model is not available for this API version/);
  assert.doesNotMatch(loggedErrors[0], /test-key-not-a-real-credential/);

  assert.equal(timeoutQuestionResponse.status, 503);
  assert.match(loggedErrors[1], /timed out after 60000 ms/);
  mockedGeminiError = null;

  const unauthorized = await realFetch(`${baseUrl}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'What were today sales?' }),
  });
  assert.equal(unauthorized.status, 401);
});
