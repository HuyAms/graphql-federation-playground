# GraphQL Fedration

You will work in three main folders:

- `router`
- `subgraph-locations`
- `subgraph-reviews`

# Schema and Queries

**Schema**

```graphql
type Query {
  latestReviews: [Review!]!
  locations: [Location!]!
  location(id: ID!): Location
}

type Review {
  id: ID!
  comment: String
  rating: Int
  👉 location: Location // location
}

type Location {
  id: ID!
  name: String!
  description: String!
  photo: String!
  👉 reviewsForLocation: [Review]! //review
  👉 overallRating: Float //review
}
```

**Queries**

Get all locations for the homepage.

```graphql
query getAllLocations {
  locations {
    id
    name
    photo
    description
    overallRating
  }
}
```

Get the latest reviews for the homepage.

```graphql
query LatestReviews {
  latestReviews {
    comment
    rating
    location {
      name
      description
    }
  }
}
```

Get details for a specific location.

```graphql
query getLocationDetails {
  location(id: "loc-1") {
    id
    name
    description
    photo
    overallRating
    reviews {
      comment
      rating
    }
  }
}
```

Submit a review for a location.

```graphql
mutation submitReview {
  submitReview(review: {comment: "Wow, such a great planet!", rating: 5, locationId: "1"}) {
    code
    success
    message
    review {
      id
      comment
      rating
    }
  }
}
```

# Rover

We can use it to run checks, publish schemas to the schema registy and much more

## Publish Subgraph

```sh
rover subgraph publish <APOLLO_GRAPH_REF> \
  --name <SUBGRAPH NAME> \
  --schema <SCHEMA FILE PATH> \
  --routing-url <ROUTING URL>
```

Example of publishing the location graph

```sh
rover subgraph publish <APOLLO_GRAPH_REF> \
  --name locations \
  --schema ./subgraph-locations/locations.graphql \
  --routing-url http://localhost:4001
```

Example of publishing the reviews graph

```sh
rover subgraph publish Huy-flyby@current \
  --name reviews \
  --schema ./subgraph-reviews/reviews.graphql \
  --routing-url http://localhost:4002
```

Now we should see changes reflected in GraphOS. It only composes the supergraph and reads data from it — it doesn't run a server. To serve the supergraph, we need **a Router**.

## Schema Check

```sh
rover subgraph check <GRAPH_REF> \
  --schema <SCHEMA_FILE_PATH> \
  --name <SUBGRAPH_NAME>
```

Example

```sh
rover subgraph check Huy-flyby@current \
  --schema ./subgraph-reviews/reviews.graphql \
  --name reviews
```

Or we can instrospect

```sh
rover subgraph introspect http://localhost:4002 \
  | rover subgraph check Huy-flyby@current \
  --schema - --name reviews
```

## Rover Dev

Composes all subgraphs defined in the `supergraph-config`

```sh
rover dev --supergraph-config ./router/supergraph-config.yaml \
   --router-config ./router/router-config.yaml
```

Starting a session from a GraphOS Studio variant

```sh
rover dev \
  --graph-ref Huy-flyby@current \
  --supergraph-config ./router/supergraph-config.yaml \
  --router-config ./router/router-config.yaml
```

📚 Resources:

- [A stub subgraph](https://www.apollographql.com/tutorials/voyage-part2/08-stub-subgraph)
- [Rover Dev Docs](https://www.apollographql.com/docs/rover/commands/dev)

# Router

## Download Router

Firstly, navigate to the **router** folder

```sh
curl -sSL https://router.apollo.dev/download/nix/v1.46.0 | sh
```

## Running

```sh
APOLLO_KEY=<YOUR-KEY>
APOLLO_GRAPH_REF=<YOUR-ROUTER-REF> ./router
```

# Migrating to subgraph

Need to add 2 things

1. Import Federation schema
2. Update ApolloServer instance

```js
// subgraph-locations/locations.graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.7",
        import: ["@key"])

// npm install @apollo/subgraph
// index.js
const { buildSubgraphSchema } = require("@apollo/subgraph");

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});
```

Flow to build a subgraph

1. BE devs design and build subgraphs
2. Someone creates a new supergraph in GraphOS Studio
3. BE devs publish subgraph schemas to the schema registry
4. Schema Registry cmoposes subgraph into **supergraph schema**, makes it available via **Apollo Uplink**
5. The router automatically polls Uplink for any new versions of the supergraph schema

# Entity

## What is an Entity?

It’s an object that is shared between subgraphs. Each subgraph can contribute fields to that object.

In our case, the Location is shared between subgraphs so it’s an Entity.

```graph
type Location {
  id: ID! // location
  name: String!  // location
  description: String!  // location
  photo: String!  // location
  👉 reviewsForLocation: [Review]! // review
  👉 overallRating: Float // review
}
```

A subgraph can

1. Reference an entity - meaning using it as a return type
2. Contribute to an entity

Example

```
// reference an entity
Review {
 id: String,
 location: Location // Location as return type
}

// contribute to an entity
type Location {
  ...
  👉 reviewsForLocation: [Review]! // review
  👉 overallRating: Float // review
}
```

## Create an Entity

To create an Entity, we need to

1. Define a **primary key**
2. Define **reference resolver** - responsible for returning all of the entity fields that this subgraph contributes

Example

```ts
// location-subgraph
type Location @key(fields: "id") {
  id: ID!
  "The name of the location"
  name: String!
  "A short description about the location"
  description: String!
  "The location's main photo as a URL"
  photo: String!
}

// review subgraph
// resolvable: false meaning there is no reference resolver yet
// and we don't contribute any fields
// it needs to define the entity here in order to use the Location type
type Location @key(fields: "id", resolvable: false) {
  id: ID!
}
```

## Entity Represenetation

It’s an object that Router uses to represent a specific entity. It contains a **\_\_typename** and the **@key** field. It's sent to a supgraph and a subgraph needs to resolve it.

Example of an Entity that a router sends to a subgraph

```
{
  "__typename": "Location",
  "id": "loc-2"
}
```

## How Router resolves an Entity

Let’s say we have this query that resolves the **Review[]** type

```graphql
query GetLatestReviews {
  latestReviews {
    id //review
    comment //review
    rating //review
    location { //? entity
      name
    }
  }
}
```

1. **Build a query plan**

   - Resolve fields from the **reviews** subgraph as usual.
   - When reaching `location.name`, which can't be resolved directly:
     - **reviews** returns a Location entity reference (`__typename` + key).
     - The router adds a step to the plan to fetch `location.name` from the **location** subgraph.

2. **Query the `reviews` subgraph**
   - Resolve all available fields normally.
   - Include the Location entity reference in the response.

### 📚 Resources

- [Entity and the query plan](https://www.apollographql.com/tutorials/voyage-part1/11-entities-and-the-query-plan)
- [Contribute to Entity](https://www.apollographql.com/tutorials/voyage-part1/13-contributing-to-an-entity)
- [Reference entity](https://www.apollographql.com/tutorials/voyage-part1/12-referencing-an-entity)

# Directives
