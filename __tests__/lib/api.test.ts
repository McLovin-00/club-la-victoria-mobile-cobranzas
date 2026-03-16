// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any;

describe("mobileApi", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.resetModules();
  });

  it("normalizes a configured base url before calling the API", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.clubvictoria.com";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    globalThis.fetch = fetchMock;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");

    await mobileApi.getCobradoresActivos();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.clubvictoria.com/api/v1/cobradores/activos",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("keeps an existing /api suffix by appending only the version", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.clubvictoria.com/api";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    globalThis.fetch = fetchMock;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");

    await mobileApi.buscarSocios("ana");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.clubvictoria.com/api/v1/cobradores/mobile/socios?q=ana",
      expect.any(Object),
    );
  });

  it("wraps network errors with a troubleshooting message", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.clubvictoria.com";
    const fetchMock = jest.fn().mockRejectedValue(new Error("socket hang up"));
    globalThis.fetch = fetchMock;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");

    await expect(mobileApi.getCobradoresActivos()).rejects.toThrow(
      "Network request failed (https://api.clubvictoria.com/api/v1/cobradores/activos)",
    );
  });
});
