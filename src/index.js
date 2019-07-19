const request = require("request-promise-native");
const uuid = require("uuid/v4");
const WebSocket = require("ws");

const Web3 = require("web3");
const { ContractWrappers } = require("@0x/contract-wrappers");

const {
    MESH_RPC_URL,
    ORDER_CREATOR_URL,
    ASSET_A_ADDRESS,
    ASSET_B_ADDRESS,
    MAKER_ADDRESS,

    // default to stopping after 1 hour
    STOP_TIMESTAMP = Math.floor(Date.now() + (1000 /* ms */ * 60 /* s */ * 60 /* m */ * 1 /* hr */)).toString()
} = process.env;

main()
    .then(() => {
        process.exitCode = 0
    })
    .catch((e) => {
        console.error(`fatal error: ${e}`);
        process.exitCode = 1;
    });

async function main() {
    await setUnlimitedProxyAllowances(MAKER_ADDRESS, [ASSET_A_ADDRESS, ASSET_B_ADDRESS]);

    let ws;
    await new Promise((r, _) => {
        ws = new WebSocket(MESH_RPC_URL);
        ws.on("open", r);
        ws.on("message", (m) => {
            console.log(`Message from server: ${m}`);
        });
    });

    let bid = true;
    const stopAt = Number(STOP_TIMESTAMP);
    console.log(ASSET_A_ADDRESS)

    // main loop - get an order with random price/size, and submit to mesh RPC
    while (Math.floor(Date.now()) < stopAt) {
        const randPrice = Math.random() * 100
        const randSize = Math.random() * 10
        const side = bid ? "bid" : "ask";

        // get an order of the other side next time
        bid = !bid;

        const response = await request(`${ORDER_CREATOR_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: createRequest(side, randPrice, randSize),
        });
        const { order } = JSON.parse(response);
        await postToMesh(ws, order);
        await new Promise((r, _) => setTimeout(r, 1500));
    }
}

async function postToMesh(ws, order) {
    const message = {
        jsonrpc: "2.0",
        id: uuid(),
        method: "mesh_addOrders",
        params: [[order]]
    };
    ws.send(JSON.stringify(message));
}

async function setUnlimitedProxyAllowances(holder, tokenAddresses) {
    const web3 = new Web3(WEB3_URL);
    const wrappers = new ContractWrappers(web3.currentProvider);
    for (let address of tokenAddresses) {
        await wrappers.erc20Token.setUnlimitedProxyAllowanceAsync(address, holder);
    }
}

function createRequest(side, price, size) {
    return JSON.stringify({
        baseAsset: ASSET_A_ADDRESS,
        quoteAsset: ASSET_B_ADDRESS,
        expiration: Math.floor(Date.now() / 1000) + 600,
        size,
        price,
        side,
    });
};