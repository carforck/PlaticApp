import type { AudioTranscriber } from "@platica/core";

/** Adaptador Groq Whisper: transcribe audio a texto (API compatible con OpenAI). */
export const groqAudio: AudioTranscriber = {
  async transcribe(audio, mimeType) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("Falta GROQ_API_KEY");
    const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mpeg") ? "mp3" : "bin";
    const form = new FormData();
    form.append("file", new Blob([audio as BlobPart], { type: mimeType }), `audio.${ext}`);
    form.append("model", model);
    form.append("language", "es");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { text: string };
    return json.text;
  },
};
