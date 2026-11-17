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

  it("posts one member and one period to the mobile quota endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ creadas: 1 }),
    });
    globalThis.fetch = fetchMock;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");

    await mobileApi.generarCuotaMobile(42, "2026-11");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.api.clublavictoria.com.ar/api/v1/cobros/mobile/socios/42/cuotas",
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ periodo: "2026-11" }),
      },
    );
  });

  it("loads and collects selected periods for one member", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    globalThis.fetch = fetchMock;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");
    const payload = { periodos: ["2026-11", "2026-12"], totalCuotasEsperado: 20000 };

    await mobileApi.obtenerPeriodosCobroMobile(42);
    await mobileApi.registrarCobroPeriodosMobile(42, payload);

    expect(fetchMock).toHaveBeenNthCalledWith(1,
      "https://www.api.clublavictoria.com.ar/api/v1/cobros/mobile/socios/42/periodos",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      "https://www.api.clublavictoria.com.ar/api/v1/cobros/mobile/socios/42/cobro-periodos",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  it("shows the server message when a period collection must be reviewed", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ message: "El saldo a favor cambió; revisá el resumen" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mobileApi } = require("../../lib/api");
    await expect(mobileApi.registrarCobroPeriodosMobile(42, {})).rejects.toThrow(
      "El saldo a favor cambió; revisá el resumen",
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
