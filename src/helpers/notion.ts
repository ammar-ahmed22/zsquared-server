import { 
  RichTextItemResponse,
  BlockObjectResponse
} from "@notionhq/client/build/src/api-endpoints"
import { Client, isFullUser, isFullBlock } from "@notionhq/client"
import { 
  IRichText,
  DatabaseProperty,
  IListItem,
  IBlock,
  IUnmergedBlock,
  IList,
} from "@z-squared/types"

/**
   * Maps Notion rich text to custom rich text type
   *
   * @param {RichTextItemResponse} item Notion rich text
   * @returns {RichText}
   */
export const mapRichText = (item: RichTextItemResponse, language?: string) : IRichText => {
  return {
    plainText: item.plain_text,
    annotations: {...item.annotations, language },
    href: item.href ?? undefined,
    inlineLatex: item.type === "equation"
  }
}

/**
   * Extracts values from Notion database property
   *
   * @private
   * @param {DatabaseProperty} property Notion database property
   * @returns {*}
   */
export const extractPropertyValue = (property: DatabaseProperty) => {
  if (property.type === "title"){
    return property.title.map( item => item.plain_text ).join("");
  }

  if (property.type === "rich_text"){
    return property.rich_text.map(r => mapRichText(r));
  }

  if (property.type === "checkbox"){
    return property.checkbox
  }

  if (property.type === "date"){
    return {
      start: property.date?.start ? new Date(property.date.start) : new Date(),
      end: property.date?.end ? new Date(property.date.end) : undefined
    }
  }

  if (property.type === "people"){
    const result: string[] = []
    property.people.reduce((acc, curr) => {
      if (isFullUser(curr)){
        acc.push(curr.name)
      }
      return acc;
    }, result)
    return result;
  }

  if (property.type === "multi_select"){
    return property.multi_select.map( item => {
      return item.name
    })
  }
}

/**
   * Recursively gets all list children
   *
   * @async
   * @param {BlockObjectResponse} block  List block item
   * @param {ListItem} item Custom list item type
   * @returns {Promise<ListItem>}
   */
export const getAllListChildren = async (notion: Client, block: BlockObjectResponse, item: IListItem) : Promise<IListItem> => {
  if (block.type === "bulleted_list_item" || block.type === "numbered_list_item"){
    if (!block.has_children){
      return item;
    } else {
      const resp = await notion.blocks.children.list({
        block_id: block.id,
        page_size: 100
      });
      for (const b of resp.results){
        if (isFullBlock(b)){
          if (b.type === "numbered_list_item" || b.type === "bulleted_list_item"){
            const type = b.type;
            const newItem : IListItem = {
              content: b[type].rich_text.map(mapRichText)
            }
            if (item.children){
              item.children.push(newItem)
            } else {
              item.children = [newItem]
            }
            await getAllListChildren(notion, b, newItem);
          }
        }
      }
    }
  }
}

/**
   * Merges list items into list objects
   *
   * @param {UnmergedBlock[]} unmerged Unmerged block array
   * @returns {Block[]}
   */
export const mergeListItems = (unmerged: IUnmergedBlock[]) : IBlock[] => {
  const merged : IBlock[] = [];
  const isListItem = (b: IUnmergedBlock) => b && b.type.includes("list_item");
  let l = 0;
  let r = 1;
  let list: IList;
  let listType : "numbered_list" | "bulleted_list";
  while(l < unmerged.length){
    const left = unmerged[l];
    const right = r < unmerged.length ? unmerged[r] : undefined;
    if (list){
      if (!right || listType !== right.type.slice(0, -5)){
        merged.push({
          type: listType,
          content: [list]
        });
        listType = undefined;
        list = undefined;
        l = r;
      } else {
        list.children.push(right.content as IListItem);
      }
      r++;
      continue;
    }

    if (right && left.type !== right.type && !isListItem(left) && isListItem(right)){
      list = {
        children: [right.content as IListItem]
      }
      listType = right.type.slice(0, -5) as "numbered_list" | "bulleted_list";
      r++
      merged.push(left as IBlock);
      continue;
    }
    merged.push(left as IBlock);
    l++;
    r++;
  }

  return merged;
}