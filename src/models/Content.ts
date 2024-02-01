import { ObjectType, Field, createUnionType } from "type-graphql";
import { Metadata } from "./Metadata";
import { 
  IRichText, 
  IAnnotations, 
  AnnotationsColor, 
  IImage,
  IListItem,
  IList,
  IBlock,
  IBlockContent,
  IPost, 
  IMetadata,
  BlockType,
  IEquation
} from "@z-squared/types";


@ObjectType({
  description: "Metadata for rich text"
})
export class Annotations implements IAnnotations{
  @Field()
  public bold: boolean;

  @Field()
  public strikethrough: boolean;

  @Field()
  public italic: boolean;

  @Field()
  public underline: boolean;

  @Field()
  public code: boolean;

  @Field(returns => String)
  public color: AnnotationsColor;

  @Field(returns => String, { nullable: true })
  public language?: string
  
}

@ObjectType({
  description: "Rich text object"
})
export class RichText implements IRichText{
  @Field()
  public plainText: string

  @Field(returns => Annotations)
  public annotations: IAnnotations

  @Field({ nullable: true })
  public href?: string

  @Field(returns => Boolean, { nullable: true })
  inlineLatex?: boolean
}


@ObjectType({ 
  description: "Image object"
})
export class Image implements IImage{
  @Field()
  public url: string

  @Field(returns => [RichText])
  public caption: IRichText[]
}


@ObjectType({
  description: "List item with unlimited depth of children"
})
export class ListItem implements IListItem{
  @Field(returns => [RichText])
  public content: IRichText[]

  @Field(returns => [ListItem], { nullable: true })
  public children?: IListItem[]
}

@ObjectType()
export class List implements IList{
  @Field(returns => [ListItem])
  public children: IListItem[]
}

@ObjectType()
export class Equation implements IEquation {
  @Field()
  public expression: string
}


export const BlockContent = createUnionType({
  name: "BlockContent",
  description: "Union type for block content",
  types: () => [Image, List, RichText, Equation] as const,
  resolveType: (value) => {
    if ("plainText" in value){
      return RichText
    }
    if ("children" in value){
      return List
    }
    if ("url" in value){
      return Image
    }

    if ("expression" in value) {
      return Equation
    }
    
    return undefined;
  }
})


@ObjectType({
  description: "Block content for posts"
})
export class Block implements IBlock{
  @Field(returns => String)
  public type: BlockType;

  @Field(returns => [BlockContent])
  public content: IBlockContent[]
}

@ObjectType()
export class Post implements IPost{

  @Field(returns => Metadata)
  public metadata: IMetadata

  @Field(returns => [Block])
  public content: IBlock[]
}