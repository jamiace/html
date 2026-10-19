/* PokéSurvivor 私人云端存檔版本：不攔截網路，不快取使用者資料。 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
