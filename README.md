# GraphQL Fedration

### Backend

You will work in three main folders:

- `router`
- `subgraph-locations`
- `subgraph-reviews`

The course will help you set up and run each of these servers.

### Queries

1. Get all locations for the homepage.

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

1. Get the latest reviews for the homepage.

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

1. Get details for a specific location.

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

1. Submit a review for a location.
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
