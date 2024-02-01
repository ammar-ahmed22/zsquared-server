import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { buildSchema } from "type-graphql";
import { BlogResolver } from "./resolvers/Blog";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import { Ammar } from "@z-squared/types"

( async () => {
  const ENDPOINT = "/graphql";
  const PORT = process.env.PORT || 8080;
  const app = express();
  const schema = await buildSchema({
    resolvers: [BlogResolver],
    emitSchemaFile: {
      path: __dirname + "/schema.gql"
    },
    dateScalarMode: "timestamp"
  });

  const server = new ApolloServer({
    schema
  })

  await server.start();
  
  app.use(
    ENDPOINT,
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server),
  )

  app.listen(PORT, () => console.log(`🚀 Server ready at http://localhost:${PORT}${ENDPOINT}`))

})()