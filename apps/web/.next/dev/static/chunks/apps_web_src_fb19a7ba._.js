(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/lib/api-client/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "login",
    ()=>login,
    "logout",
    ()=>logout
]);
async function login(payload) {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let message = "Login failed";
        try {
            const data = await response.json();
            if (data?.message) {
                message = data.message;
            }
        } catch  {
        // ignore parse errors
        }
        throw new Error(message);
    }
    return response.json();
}
async function logout() {
    const token = localStorage.getItem("casemove_token");
    await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? {
            Authorization: `Bearer ${token}`
        } : undefined
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/store/auth.store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuthStore",
    ()=>useAuthStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$4$2e$5$2e$7_$40$types$2b$react$40$18$2e$3$2e$27_react$40$18$2e$2$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zustand@4.5.7_@types+react@18.3.27_react@18.2.0/node_modules/zustand/esm/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2d$client$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/api-client/auth.ts [app-client] (ecmascript)");
;
;
const useAuthStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zustand$40$4$2e$5$2e$7_$40$types$2b$react$40$18$2e$3$2e$27_react$40$18$2e$2$2e$0$2f$node_modules$2f$zustand$2f$esm$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["create"])((set)=>({
        token: null,
        isInitialized: false,
        personaName: null,
        steamStatus: "idle",
        loading: false,
        error: null,
        setToken: (token)=>{
            set({
                token
            });
            localStorage.setItem("casemove_token", token);
        },
        setPersonaName: (name)=>{
            set({
                personaName: name
            });
            if (name) {
                localStorage.setItem("casemove_persona", name);
            } else {
                localStorage.removeItem("casemove_persona");
            }
        },
        setSteamStatus: (status)=>set({
                steamStatus: status
            }),
        setError: (message)=>set({
                error: message
            }),
        initFromStorage: ()=>{
            set({
                isInitialized: false
            });
            const token = localStorage.getItem("casemove_token");
            const personaName = localStorage.getItem("casemove_persona");
            if (token) {
                set({
                    token
                });
            }
            if (personaName) {
                set({
                    personaName
                });
            }
            set({
                isInitialized: true
            });
        },
        logout: async ()=>{
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2d$client$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logout"])();
            } finally{
                set({
                    token: null,
                    steamStatus: "idle",
                    error: null,
                    personaName: null
                });
                localStorage.removeItem("casemove_token");
                localStorage.removeItem("casemove_persona");
            }
        },
        login: async (payload)=>{
            set({
                loading: true,
                error: null
            });
            try {
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2d$client$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["login"])(payload);
                set({
                    token: result.token,
                    steamStatus: "connected",
                    personaName: result.personaName ?? null,
                    loading: false
                });
                localStorage.setItem("casemove_token", result.token);
                if (result.personaName) {
                    localStorage.setItem("casemove_persona", result.personaName);
                } else {
                    localStorage.removeItem("casemove_persona");
                }
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : "Login failed",
                    steamStatus: "error",
                    loading: false
                });
            }
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/app/AuthInit.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AuthInit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1_react$2d$dom$40$18$2e$2$2e$0_react$40$18$2e$2$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.1_react-dom@18.2.0_react@18.2.0/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$store$2f$auth$2e$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/store/auth.store.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function AuthInit() {
    _s();
    const initFromStorage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$store$2f$auth$2e$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])({
        "AuthInit.useAuthStore[initFromStorage]": (state)=>state.initFromStorage
    }["AuthInit.useAuthStore[initFromStorage]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1_react$2d$dom$40$18$2e$2$2e$0_react$40$18$2e$2$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthInit.useEffect": ()=>{
            initFromStorage();
        }
    }["AuthInit.useEffect"], [
        initFromStorage
    ]);
    return null;
}
_s(AuthInit, "qxlaDdSgI4OqUsEW/cZyadwPfUg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$store$2f$auth$2e$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"]
    ];
});
_c = AuthInit;
var _c;
__turbopack_context__.k.register(_c, "AuthInit");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_src_fb19a7ba._.js.map