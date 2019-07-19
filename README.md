# Tool: `mesh-order-poster`

Post test orders to a 0x mesh node.

## Start
Set missing config environment variables in `docker-compose.yaml`, then run:

```bash
docker-compose up --build
```

Add the `-d` flag to run in the background.

## Environment
- `WEB3_URL` - JSONRPC-API endpoint of an Ethereum node.
- `MESH_RPC_URL` - JSONRPC-API endpoint of a 0x-mesh node.
- `MAKER_ADDRESS` - The address of the order maker (for setting allowances).
- `ORDER_CREATOR_URL` - URL of a Zaidan `order-creator` service.
- `STOP_TIMESTAMP_MS` - A UNIX timestamp (in ms) at which to stop posting orders.
- `ASSET_A_ADDRESS` - ERC-20 token address to use as first test token.
- `ASSET_B_ADDRESS` - ERC-20 token address to use as second test token.
