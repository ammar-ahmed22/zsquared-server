import { ID, ObjectType, Field } from "type-graphql";
import { IMetadata, IRichText } from "@z-squared/types";
import { RichText } from "./Content";

@ObjectType({
  description: "Post metadata",
})
export class Metadata implements IMetadata {
  constructor(params?: IMetadata) {
    Object.assign(this, params);
  }
  @Field(returns => ID)
  public id: string;

  @Field()
  public name: string;

  @Field(returns => [String])
  public categories: string[];

  @Field()
  public publishDate: Date;

  @Field()
  public publish: boolean;

  @Field(returns => [String])
  public authors: string[];

  @Field()
  public slug: string;

  @Field(returns => [RichText])
  public description: IRichText[];

  @Field({ nullable: true })
  public image?: string;

  @Field(returns => Boolean, { nullable: true })
  public featured?: boolean;
}
