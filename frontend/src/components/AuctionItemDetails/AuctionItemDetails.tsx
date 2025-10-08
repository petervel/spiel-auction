import parse from 'html-react-parser';
import { Item } from '../../model/Item';
import './AuctionItemDetails.css';

interface Props {
	item: Item;
}

const AuctionItemDetails = ({ item }: Props) => {
	return (
		<div className="bgg-text">
			{item ? (
				<div>
					<div>
						{'seller: '}
						<a
							href={`https://boardgamegeek.com/user/${item.username}`}
							target="_blank"
							rel="noreferrer"
						>
							{item.username}
						</a>
					</div>
					<div>{parse(toHtml(item.body))}</div>
				</div>
			) : (
				'loading...'
			)}
		</div>
	);
};

export default AuctionItemDetails;

function toHtml(text: string): string {
	text = replaceTags(text);
	text = replaceStrikethroughs(text);
	text = replaceBolds(text);
	text = replaceItalics(text);
	text = replaceSizes(text);
	text = replaceNewlines(text);
	text = replaceUrls(text);
	text = replaceUnderlines(text);
	text = replaceColours(text);
	text = replaceCharacters(text);
	text = replaceStars(text);
	text = replaceUsers(text);
	text = replaceThings(text);
	text = replaceBggEmojis(text);
	text = replaceExternalImages(text);
	return text;
}

function replaceTags(text: string): string {
	text = text.replace(/>/gi, '&gt;');
	text = text.replace(/</gi, '&lt;');
	return text;
}

function replaceStrikethroughs(text: string): string {
	text = text.replace(/\[-\]/gi, '<s>');
	text = text.replace(/\[\/-\]/gi, '</s>');
	return text;
}
function replaceBolds(text: string): string {
	text = text.replace(/\[b\]/gi, '<b>');
	text = text.replace(/\[\/b\]/gi, '</b>');
	return text;
}
function replaceItalics(text: string): string {
	text = text.replace(/\[i\]/gi, '<i>');
	text = text.replace(/\[\/i\]/gi, '</i>');
	return text;
}
function replaceSizes(text: string): string {
	text = text.replace(
		/\[size=(\d+)\]/gi,
		(_, pts: string) => `<span style="font-size: ${Number(pts) / 12}em">`
	);
	text = text.replace(/\[\/size\]/gi, '</span>');
	return text;
}
function replaceNewlines(text: string): string {
	text = text.replace(/\n/gi, '<br>');
	return text;
}
function replaceUrls(text: string): string {
	text = text.replace(/\[url=([^\]]+)]/gi, '<a href="$1">');
	text = text.replace(/\[\/url\]/gi, '</a>');
	return text;
}
function replaceUnderlines(text: string) {
	text = text.replace(/\[u\]/gi, '<u>');
	text = text.replace(/\[\/u\]/gi, '</u>');
	return text;
}
function replaceColours(text: string): string {
	text = text.replace(/\[color=(#[a-f0-9]+)\]/gi, (_, b) => {
		const txt = `<span style="color: ${b}">`;
		return txt;
	});
	text = text.replace(/\[\/color\]/gi, '</span>');
	return text;
}
function replaceCharacters(text: string): string {
	text = text.replace(/\[c\]/gi, '');
	text = text.replace(/\[\/c\]/gi, '');
	return text;
}
function replaceStars(text: string): string {
	text = text.replace(/:star:/gi, '&#x2605;');
	text = text.replace(
		/:halfstar:/gi,
		'<span style="opacity:0.6">&#x2605;</span>'
	);
	text = text.replace(/:nostar:/gi, '&#x2606;');
	return text;
}
function replaceUsers(text: string): string {
	text = text.replace(
		/\[user=([^[]+)\]/gi,
		'<a href="https://boardgamegeek.com/user/$1">$1'
	);
	text = text.replace(/\[\/user\]/gi, '</a>');
	return text;
}
function replaceThings(text: string): string {
	text = text.replace(
		/\[thing=(\d+)\]/gi,
		'<a href="https://boardgamegeek.com/thing/$1">'
	);
	text = text.replace(/\[\/thing\]/gi, '</a>');
	return text;
}
function replaceBggEmojis(text: string): string {
	text = text.replace(/:arrowE:/gi, '&#10140;');
	return text;
}
function replaceExternalImages(text: string): string {
	text = text.replace(
		/\[img\]([^[]+)\[\/img\]/gi,
		'<img src="$1" style="max-width: 60%;"/>'
	);
	return text;
}
