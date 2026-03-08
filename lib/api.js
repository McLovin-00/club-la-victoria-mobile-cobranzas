"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileApi = void 0;
var expo_constants_1 = require("expo-constants");
function normalizeApiBaseUrl(baseUrl) {
    var sanitized = baseUrl.replace(/\/+$/, "");
    if (/\/api\/v\d+$/i.test(sanitized)) {
        return sanitized;
    }
    if (/\/api$/i.test(sanitized)) {
        return "".concat(sanitized, "/v1");
    }
    return "".concat(sanitized, "/api/v1");
}
var configuredApiUrl = (_a = process.env.EXPO_PUBLIC_API_URL) === null || _a === void 0 ? void 0 : _a.trim();
var fallbackApiUrl = ((_b = expo_constants_1.default.expoConfig) === null || _b === void 0 ? void 0 : _b.hostUri)
    ? "http://".concat(expo_constants_1.default.expoConfig.hostUri.split(":")[0], ":3001")
    : "http://127.0.0.1:3001";
var API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl && configuredApiUrl.length > 0 ? configuredApiUrl : fallbackApiUrl);
function request(path, options) {
    return __awaiter(this, void 0, void 0, function () {
        var res, error_1, detail, text;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch("".concat(API_BASE_URL).concat(path), __assign({ headers: __assign({ "Content-Type": "application/json" }, ((_a = options === null || options === void 0 ? void 0 : options.headers) !== null && _a !== void 0 ? _a : {})) }, options))];
                case 1:
                    res = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    detail = error_1 instanceof Error ? error_1.message : "Unknown network error";
                    throw new Error("Network request failed (".concat(API_BASE_URL).concat(path, "). Verifica EXPO_PUBLIC_API_URL y que el backend escuche en 0.0.0.0 (no solo localhost). Detalle: ").concat(detail));
                case 3:
                    if (!!res.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, res.text()];
                case 4:
                    text = _b.sent();
                    throw new Error(text || "HTTP ".concat(res.status));
                case 5: return [4 /*yield*/, res.json()];
                case 6: return [2 /*return*/, (_b.sent())];
            }
        });
    });
}
exports.mobileApi = {
    getCobradoresActivos: function () { return request("/cobradores/activos"); },
    vincularDispositivo: function (payload) {
        return request("/cobradores/vinculacion-inicial", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
    buscarSocios: function (query) {
        return request("/cobradores/mobile/socios?q=".concat(encodeURIComponent(query)));
    },
    cuotasPendientes: function (socioId) {
        return request("/cobradores/mobile/socios/".concat(socioId, "/cuotas-pendientes"));
    },
    registrarOperacionCobro: function (payload) {
        return request("/cobros/pagos/operacion", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
    misCobranzas: function (cobradorId, desdeIso, hastaIso) {
        return request("/cobradores/".concat(cobradorId, "/mis-cobranzas?desde=").concat(encodeURIComponent(desdeIso), "&hasta=").concat(encodeURIComponent(hastaIso)));
    },
    // Grupos Familiares
    getGruposFamiliares: function () {
        return request("/cobradores/mobile/grupos-familiares");
    },
    getGrupoFamiliar: function (grupoId) {
        return request("/cobradores/mobile/grupos-familiares/".concat(grupoId));
    },
};
