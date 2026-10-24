// Small helpers for human-friendly unique codes.
const pad = (n, len = 4) => String(n).padStart(len, '0');

const memberCode = (id) => `IBC${1000 + Number(id)}`;
const orderCode  = () => `ORD-${Date.now().toString().slice(-8)}`;

module.exports = { pad, memberCode, orderCode };
