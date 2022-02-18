# Brief

It's for chopping up OpenAPI specs and that. Feed it some URIs, it merrily chops away. Good for paring down massive specs into bite-sized chunks. OpenAPI only (not Swagger).

More details to follow soon...

# Usage

Do as follows:

```bash
git clone https://github.com/SensibleWood/openapi-chopper
cd openapi-chopper
yarn install && mkdir build
./scripts/chopper.js --input test/data/petstore-input.yaml --output build/test-output.yaml /pet
```

Lovely :thumbsup:


