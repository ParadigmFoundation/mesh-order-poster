const request = require("request-promise-native");
const uuid = require("uuid/v4");
const WebSocket = require("ws");

const Web3 = require("web3");
const { ContractWrappers } = require("@0x/contract-wrappers");

const {
    WEB3_URL,
    MESH_RPC_URL,
    ORDER_CREATOR_URL,
    ASSET_A_ADDRESS,
    ASSET_B_ADDRESS,
    MAKER_ADDRESS,

    // default to stopping after 1 hour
    STOP_TIMESTAMP_MS = Math.floor(Date.now() + (1000 /* ms */ * 60 /* s */ * 60 /* m */ * 1 /* hr */)).toString(),

    // set to truthy val if allowances should be set
    SET_ALLOWANCES = false,
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
    if (SET_ALLOWANCES) {
        await setUnlimitedProxyAllowances(MAKER_ADDRESS, [ASSET_A_ADDRESS, ASSET_B_ADDRESS]);
    }

    let ws;
    await new Promise((r, _) => {
        ws = new WebSocket(MESH_RPC_URL);
        ws.on("open", r);
        ws.on("message", (m) => {
            console.log(`Message from server: ${m}`);
        });
    });

    // start with posting bids, switch each time
    let bid = true;
    const stopAt = Number(STOP_TIMESTAMP_MS);

    // main loop - get an order with random price/size, and submit to mesh RPC
    while (Math.floor(Date.now()) < stopAt) {
        const randPrice = Math.random() * 1
        const randSize = Math.random() * 10
        const side = bid ? "bid" : "ask";

        // get an order of the other side next time
        bid = !bid;

        const response = await request(`${ORDER_CREATOR_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: createRequest(side, randPrice, randSize),
        });

        // send order to mesh
        const { order } = JSON.parse(response);
        await postToMesh(ws, order);

        // wait 1.5s until the next order
        await new Promise((r, _) => setTimeout(r, 1500));
    }
}

// send a JSONRPC request to a mesh node to add an order
async function postToMesh(ws, order) {
    const message = {
        jsonrpc: "2.0",
        id: uuid(),
        method: "mesh_addOrders",
        params: [[order]]
    };
    ws.send(JSON.stringify(message));
}

// set an unlimit ERC-20 proxy allowance for each tokenAddress
async function setUnlimitedProxyAllowances(holder, tokenAddresses) {
    const web3 = new Web3(WEB3_URL);
    const wrappers = new ContractWrappers(web3.currentProvider, {
        networkId: await web3.eth.net.getId(),
    });
    for (let address of tokenAddresses) {
        try {
            await wrappers.erc20Token.setUnlimitedProxyAllowanceAsync(address, holder);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}

// create a request for the order-creator
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