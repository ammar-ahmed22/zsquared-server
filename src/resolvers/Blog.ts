import {
  Resolver,
  Query,
  Arg,
  ArgsType,
  Field,
  Args,
} from "type-graphql";
import { Client } from "@notionhq/client";
import { isFullPage } from "@notionhq/client";
import {
  PageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  IMetadata,
  IListItem,
  IBlock,
  IUnmergedBlock,
  IRichText,
} from "@z-squared/types";
import {
  extractPropertyValue,
  mapRichText,
  getAllListChildren,
  mergeListItems,
} from "../helpers/notion";
import { Metadata } from "../models/Metadata";
import { Block, Post } from "../models/Content";

@ArgsType()
class MetadataArgs {
  @Field(returns => [String], { nullable: true })
  categories: string[] = [];

  @Field({ nullable: true, defaultValue: false })
  onlyPublished: boolean = false;

  @Field({ nullable: true, defaultValue: true })
  ascending: boolean = true;
}

@Resolver()
export class BlogResolver {
  constructor(
    private notion = new Client({
      auth: process.env.NOTION_TOKEN,
    }),
    private db_id = process.env.BLOG_DB_ID as string,
  ) {}

  /**
   * Creates metadata from Notion database entry
   *
   * @async
   * @param {PageObjectResponse} page Notion database entry
   * @returns {Promise<IMetadata>}
   */
  private createMetadata = async (
    page: PageObjectResponse,
  ): Promise<IMetadata> => {
    const {
      Name,
      Authors,
      Categories,
      PublishDate,
      Publish,
      Slug,
      Description,
      Featured,
    } = page.properties;
    const name = extractPropertyValue(Name) as string;
    const slug: IRichText[] = extractPropertyValue(
      Slug,
    ) as IRichText[];
    const nameSlug = name
      .toLowerCase()
      .split(" ")
      .join("-");
    if (!slug.length) {
      await this.notion.pages.update({
        page_id: page.id,
        properties: {
          Slug: {
            rich_text: [
              {
                text: {
                  content: nameSlug,
                },
              },
            ],
          },
        },
      });
    }

    let image: string;
    if (page.cover) {
      if (page.cover.type === "external") {
        image = page.cover.external.url;
      }
      if (page.cover.type === "file") {
        image = page.cover.file.url;
      }
    }

    return {
      id: page.id,
      name,
      slug: !slug.length
        ? nameSlug
        : slug.map(item => item.plainText).join(""),
      authors: extractPropertyValue(Authors) as string[],
      categories: extractPropertyValue(
        Categories,
      ) as string[],
      publishDate:
        (
          extractPropertyValue(PublishDate) as {
            start: Date;
            end: Date | undefined;
          }
        ).start ?? new Date(),
      publish: extractPropertyValue(Publish) as boolean,
      description: extractPropertyValue(
        Description,
      ) as IRichText[],
      image,
      featured: extractPropertyValue(Featured) as boolean,
    };
  };

  private createBlocks = async (
    blocks: BlockObjectResponse[],
  ): Promise<IBlock[]> => {
    const unmerged = await Promise.all(
      blocks
        .map(async (block): Promise<IUnmergedBlock> => {
          if (
            block.type === "heading_1" ||
            block.type === "heading_2" ||
            block.type === "heading_3" ||
            block.type === "paragraph"
          ) {
            const type = block.type;
            return {
              type: block.type,
              content: block[type].rich_text.map(r =>
                mapRichText(r),
              ),
            };
          }

          if (block.type === "image") {
            if (block.image.type === "external") {
              return {
                type: "image",
                content: [
                  {
                    url: block.image.external.url,
                    caption: block.image.caption.map(r =>
                      mapRichText(r),
                    ),
                  },
                ],
              };
            }
            if (block.image.type === "file") {
              return {
                type: "image",
                content: [
                  {
                    url: block.image.file.url,
                    caption: block.image.caption.map(r =>
                      mapRichText(r),
                    ),
                  },
                ],
              };
            }
          }

          if (
            block.type === "bulleted_list_item" ||
            block.type === "numbered_list_item"
          ) {
            const type = block.type;
            const listItem: IListItem = {
              content: block[type].rich_text.map(r =>
                mapRichText(r),
              ),
            };
            await getAllListChildren(
              this.notion,
              block,
              listItem,
            );
            return {
              type,
              content: listItem,
            };
          }

          if (block.type === "equation") {
            return {
              type: block.type,
              content: [
                {
                  expression: block.equation.expression,
                },
              ],
            };
          }

          if (block.type === "code") {
            const { language } = block.code;
            return {
              type: block.type,
              content: block.code.rich_text.map(r =>
                mapRichText(r, language),
              ),
            };
          }
        })
        .filter(b => b),
    );
    return mergeListItems(unmerged);
  };

  private getAllPaginatedBlocks = async (
    blockId: string,
  ) => {
    let hasNext = true;
    let startCursor = undefined;
    let result: (
      | PartialBlockObjectResponse
      | BlockObjectResponse
    )[] = [];
    while (hasNext) {
      const resp = await this.notion.blocks.children.list({
        block_id: blockId,
        start_cursor: startCursor,
        page_size: 100,
      });

      hasNext = resp.has_more;
      startCursor = resp.next_cursor;
      result = result.concat(resp.results);
    }
    return result;
  };

  private createFilter = (
    categories: string[],
    onlyPublished: boolean,
    featured: boolean,
  ) => {
    // Only allow for testing posts to be sent in dev environment
    if (process.env.NODE_ENV === "development") {
      categories.push("Testing");
    }

    const hasCategories = !!categories.length;
    console.log({ hasCategories });
    const categoryMap = categories.map(category => ({
      property: "Categories",
      multi_select: {
        contains: category,
      },
    }));
    if (hasCategories && !onlyPublished && !featured) {
      return {
        or: categoryMap,
      };
    }
    const res = {
      and: [],
    };
    if (onlyPublished) {
      res.and.push({
        property: "Publish",
        checkbox: {
          equals: true,
        },
      });
    }

    if (hasCategories) {
      res.and.push({
        or: categoryMap,
      });
    }

    // Filter out testing posts in production
    if (process.env.NODE_ENV === "production") {
      res.and.push({
        property: "Categories",
        multi_select: {
          does_not_contain: "Testing",
        },
      });
    }

    if (featured) {
      res.and.push({
        property: "Featured",
        checkbox: {
          equals: true,
        },
      });
    }

    return res;
  };

  @Query(returns => [Metadata])
  async metadata(
    @Arg("categories", returns => [String], {
      nullable: true,
      defaultValue: [],
    })
    categories: string[] = [],
    @Arg("onlyPublished", {
      nullable: true,
      defaultValue: false,
    })
    onlyPublished: boolean = false,
    @Arg("ascending", {
      nullable: true,
      defaultValue: true,
    })
    ascending: boolean = true,
    @Arg("featured", {
      nullable: true,
      defaultValue: false,
    })
    featured: boolean = false,
  ) {
    const filter = this.createFilter(
      categories,
      onlyPublished,
      featured,
    );

    const resp = await this.notion.databases.query({
      database_id: this.db_id,
      filter,
      sorts: [
        {
          property: "PublishDate",
          direction: ascending ? "ascending" : "descending",
        },
      ],
    });

    const result = await Promise.all(
      resp.results.map(async page => {
        if (isFullPage(page)) {
          const metadata = await this.createMetadata(page);
          return new Metadata(metadata);
        }
      }),
    );

    return result;
  }

  @Query(returns => Metadata)
  async metadataBySlug(@Arg("slug") slug: string) {
    const resp = await this.notion.databases.query({
      database_id: this.db_id,
      filter: {
        and: [
          {
            property: "Slug",
            rich_text: {
              equals: slug,
            },
          },
        ],
      },
    });
    if (!resp.results.length) {
      throw new Error("Could not find post!");
    }

    const [page] = resp.results;
    if (isFullPage(page)) {
      const metadata = await this.createMetadata(page);
      return new Metadata(metadata);
    }
  }

  @Query(returns => [Block])
  async content(@Arg("id") id: string): Promise<IBlock[]> {
    const blocks = await this.getAllPaginatedBlocks(id);
    const parsed = await this.createBlocks(
      blocks as BlockObjectResponse[],
    );
    return parsed;
  }

  @Query(returns => [String])
  async categories() {
    const res = await this.notion.databases.retrieve({
      database_id: this.db_id,
    });

    if (res.properties.Categories.type === "multi_select") {
      return res.properties.Categories.multi_select.options
        .map(option => option.name)
        .filter(c => {
          if (
            process.env.NODE_ENV === "production" &&
            c === "Testing"
          )
            return false;
          return true;
        });
    }
    return [];
  }

  @Query(returns => [Metadata])
  async searchMetadata(@Arg("query") query: string) {
    const filter = (() => {
      let filter: any = {
        and: [
          {
            property: "Name",
            title: {
              contains: query,
            },
          },
        ],
      };
      if (process.env.NODE_ENV === "production") {
        filter.and.push({
          property: "Categories",
          multi_select: {
            does_not_contain: "Testing",
          },
        });
      }

      return filter;
    })();

    const resp = await this.notion.databases.query({
      database_id: this.db_id,
      filter,
    });

    const results = resp.results as PageObjectResponse[];

    const parsed = await Promise.all(
      results.map(async page => {
        const metadata = await this.createMetadata(page);
        return new Metadata(metadata);
      }),
    );

    return parsed;
  }

  @Query(returns => String)
  async test() {
    const res = await this.notion.databases.query({
      database_id: this.db_id,
    });

    console.log(res.results);

    return "all good in the hood";
  }
}
