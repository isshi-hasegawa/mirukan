import { assertEquals } from "jsr:@std/assert";
import { suggestDisplayTitle, translateSearchQuery } from "./gemini.ts";

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

async function withMockFetch(
  handler: (url: URL, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input);
    return await handler(url, init);
  }) as typeof fetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// supabase env を未設定にすることで readGeminiCache / writeGeminiCache を no-op にする

Deno.test("translateSearchQuery は日本語を含まない入力で null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      assertEquals(await translateSearchQuery("pure english title"), null);
      assertEquals(await translateSearchQuery("   "), null);
    },
  );
});

Deno.test("translateSearchQuery は Gemini の JSON 結果を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        (url) => {
          assertEquals(url.hostname, "generativelanguage.googleapis.com");
          return geminiResponse(JSON.stringify({ query: "Spirited Away" }));
        },
        async () => {
          assertEquals(await translateSearchQuery("千と千尋の神隠し"), "Spirited Away");
        },
      );
    },
  );
});

Deno.test("translateSearchQuery は余計な前後テキスト付き JSON も抽出する", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse('Here is the translation:\n{"query": "Your Name"}\nThank you.'),
        async () => {
          assertEquals(await translateSearchQuery("君の名は"), "Your Name");
        },
      );
    },
  );
});

Deno.test("translateSearchQuery は query が入力と同一なら null にする", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse(JSON.stringify({ query: "ワンピース" })),
        async () => {
          assertEquals(await translateSearchQuery("ワンピース"), null);
        },
      );
    },
  );
});

Deno.test("translateSearchQuery は Gemini 失敗時に null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => new Response("boom", { status: 500 }),
        async () => {
          assertEquals(await translateSearchQuery("進撃の巨人"), null);
        },
      );
    },
  );
});

Deno.test("translateSearchQuery は GEMINI_API_KEY 未設定で null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      assertEquals(await translateSearchQuery("鬼滅の刃"), null);
    },
  );
});

Deno.test("translateSearchQuery はパース不能レスポンスで null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse("no json here"),
        async () => {
          assertEquals(await translateSearchQuery("呪術廻戦"), null);
        },
      );
    },
  );
});

Deno.test("suggestDisplayTitle は空 title で null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      assertEquals(
        await suggestDisplayTitle({ title: "   ", originalTitle: null, workType: "movie" }),
        null,
      );
    },
  );
});

Deno.test("suggestDisplayTitle は Gemini の title 候補を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse(JSON.stringify({ title: "君の名は。" })),
        async () => {
          assertEquals(
            await suggestDisplayTitle({
              title: "Your Name",
              originalTitle: "君の名は。",
              workType: "movie",
            }),
            "君の名は。",
          );
        },
      );
    },
  );
});

Deno.test("suggestDisplayTitle は候補が現タイトルと同じなら null にする", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse(JSON.stringify({ title: "Your Name" })),
        async () => {
          assertEquals(
            await suggestDisplayTitle({
              title: "Your Name",
              originalTitle: null,
              workType: "movie",
            }),
            null,
          );
        },
      );
    },
  );
});

Deno.test("suggestDisplayTitle は Gemini 失敗時に null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => new Response("fail", { status: 502 }),
        async () => {
          assertEquals(
            await suggestDisplayTitle({
              title: "Attack on Titan",
              originalTitle: "進撃の巨人",
              workType: "series",
            }),
            null,
          );
        },
      );
    },
  );
});

Deno.test("suggestDisplayTitle は title フィールド欠落で null を返す", async () => {
  await withEnv(
    {
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        () => geminiResponse(JSON.stringify({ other: "value" })),
        async () => {
          assertEquals(
            await suggestDisplayTitle({
              title: "Demon Slayer",
              originalTitle: null,
              workType: "series",
            }),
            null,
          );
        },
      );
    },
  );
});
