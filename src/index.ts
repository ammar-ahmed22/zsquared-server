import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { buildSchema } from "type-graphql";
import { BlogResolver } from "./resolvers/Blog";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import { logServerStatus } from "./helpers/logs";

(async () => {
  const ENDPOINT = "/graphql";
  const PORT = parseInt(process.env.PORT) || 8080;
  const HOST = process.env.HOST || "http://localhost";
  const app = express();
  const schema = await buildSchema({
    resolvers: [BlogResolver],
    emitSchemaFile: {
      path: __dirname + "/schema.gql",
    },
    dateScalarMode: "timestamp",
  });

  const server = new ApolloServer({
    schema,
    introspection: true,
    plugins: [ApolloServerPluginLandingPageLocalDefault()],
  });

  await server.start();

  app.use(
    ENDPOINT,
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server),
  );

  app.listen(PORT, () =>
    logServerStatus(process.env.NODE_ENV, PORT, ENDPOINT),
  );
})();
