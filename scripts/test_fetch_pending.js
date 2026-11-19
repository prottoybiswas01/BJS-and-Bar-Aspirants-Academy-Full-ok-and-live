const { fetchYoutubeTranscript } = require('./server/services/transcriptService');

async function testFetch() {
  const ids = ['2_Pbw6Ow3yE', 'JgX_6916KkI', 'dRtyx7qwZVA'];
  for (const id of ids) {
    console.log(`Testing fetch for ${id}...`);
    const res = await fetchYoutubeTranscript(id);
    console.log(`Result for ${id}:`, {
      ok: res.ok,
      status: res.status,
      language: res.language,
      lineCount: res.lineCount,
      wordCount: res.wordCount,
      sample: res.transcript ? res.transcript.substring(0, 150) : res.message
    });
  }
}
testFetch().catch(console.error);
