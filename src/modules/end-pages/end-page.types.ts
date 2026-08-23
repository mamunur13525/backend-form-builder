import { ContentAlignment } from "../../constants/theme";
import { ICoverImage, IEndPageButton, IEndPageEmbed, IEndPageRedirect, IEndPageSocialShareMedia } from "../../models/Form";

export interface CreateEndPageBody {
  title?: string;
  helperText?: string;
  paragraph?: string;
  coverImage?: ICoverImage | null;
  embed?: IEndPageEmbed;
  alignment?: ContentAlignment;
  button?: IEndPageButton;
  redirect?: IEndPageRedirect;
  showConfetti?: boolean;
  socialShareButtons?: boolean;
  socialShareMessage?: string;
  socialShareMedia?: IEndPageSocialShareMedia;
}

export interface UpdateEndPageBody {
  title?: string;
  helperText?: string;
  paragraph?: string;
  coverImage?: ICoverImage | null;
  embed?: IEndPageEmbed;
  alignment?: ContentAlignment;
  button?: IEndPageButton;
  redirect?: IEndPageRedirect;
  showConfetti?: boolean;
  socialShareButtons?: boolean;
  socialShareMessage?: string;
  socialShareMedia?: IEndPageSocialShareMedia;
  order?: number;
}

export interface ReorderEndPagesBody {
  endPageIds: string[];
}
