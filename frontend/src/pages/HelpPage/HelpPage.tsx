import {
	BarChartRounded,
	ExpandMoreRounded,
	FavoriteBorderRounded,
	FavoriteRounded,
	HeartBrokenRounded,
	Sell,
	ShoppingBasket,
	StarBorderRounded,
	StarRounded,
	WatchLaterRounded,
} from '@mui/icons-material';
import { Divider, Link, Stack, Typography } from '@mui/material';
import classNames from 'classnames';
import { ReactNode } from 'react';
import bggIcon from '../../assets/bgg.svg';
import { BackButton } from '../../components/BackButton/BackButton';
import { Container } from '../../components/Container/Container';
import { Title } from '../../components/Title/Title';
import priceCss from '../../components/AuctionPrice/AuctionPrice.module.css';
import css from './HelpPage.module.css';

// A row of icon/swatch + explanation - shared shape for every section below.
const HelpRow = ({
	icon,
	children,
}: {
	icon: ReactNode;
	children: ReactNode;
}) => (
	<div className={css.row}>
		<div className={css.iconSlot}>{icon}</div>
		<Typography variant="body2">{children}</Typography>
	</div>
);

export const HelpPage = () => {
	return (
		<Container>
			<Title title="Help" left={<BackButton />} />
			<Stack paddingInline="1rem" paddingBottom="2rem">
				<Typography variant="h6">The price badge</Typography>
				<div className={css.section}>
					<HelpRow
						icon={<div className={classNames(priceCss.price, css.swatch)}>€10</div>}
					>
						No bids yet - shows the starting price.
					</HelpRow>
					<HelpRow
						icon={
							<div
								className={classNames(
									priceCss.price,
									priceCss.hasBids,
									css.swatch
								)}
							>
								€15
							</div>
						}
					>
						Has bids - shows the current highest bid.
					</HelpRow>
					<HelpRow
						icon={
							<div
								className={classNames(
									priceCss.price,
									priceCss.winning,
									css.swatch
								)}
							>
								€15
							</div>
						}
					>
						You're currently the highest bidder on this item.
					</HelpRow>
					<HelpRow
						icon={
							<div
								className={classNames(
									priceCss.price,
									priceCss.hasBids,
									css.swatch
								)}
							>
								€20!
							</div>
						}
					>
						The "!" means this price is also the seller's fixed
						Buy-It-Now price - paying it ends the auction
						immediately.
					</HelpRow>
					<HelpRow icon={<div className={classNames(priceCss.price, css.swatch)} />}>
						An item with a strikethrough title and dimmed price has
						ended.
					</HelpRow>
				</div>

				<Divider />

				<Typography variant="h6" marginTop="1rem">
					The tabs
				</Typography>
				<div className={css.section}>
					<HelpRow
						icon={<WatchLaterRounded sx={{ color: 'var(--colour-inactive)' }} />}
					>
						<b>Latest</b> - every item across the whole auction,
						newest first.
					</HelpRow>
					<HelpRow icon={<Sell sx={{ color: 'var(--colour-inactive)' }} />}>
						<b>Selling</b> - items a BGG username is selling.
					</HelpRow>
					<HelpRow
						icon={<ShoppingBasket sx={{ color: 'var(--colour-inactive)' }} />}
					>
						<b>Buying</b> - items a BGG username is bidding on or
						has won.
					</HelpRow>
					<HelpRow
						icon={<HeartBrokenRounded sx={{ color: 'var(--colour-inactive)' }} />}
					>
						<b>Outbid & Liked</b> - items you've liked, plus any of
						them you've since been outbid on.
					</HelpRow>
					<HelpRow icon={<StarRounded sx={{ color: 'var(--colour-inactive)' }} />}>
						<b>Wishlist</b> - games from your BGG wishlist, split
						into ones currently up for auction and ones that
						aren't (yet).
					</HelpRow>
					<Typography variant="caption" color="text.secondary">
						The current tab is highlighted in blue.
					</Typography>
				</div>

				<Divider />

				<Typography variant="h6" marginTop="1rem">
					Icons on an item
				</Typography>
				<div className={css.section}>
					<HelpRow icon={<BarChartRounded className="icon" />}>
						Compare this game across every auction listing of it.
					</HelpRow>
					<HelpRow icon={<img src={bggIcon} width={24} height={24} />}>
						Open this specific listing on BoardGameGeek.
					</HelpRow>
					<HelpRow icon={<FavoriteBorderRounded sx={{ color: 'var(--color-heart)' }} />}>
						Like an item, to find it back later on the "Outbid &
						Liked" tab.
					</HelpRow>
					<HelpRow icon={<FavoriteRounded sx={{ color: 'var(--color-heart)' }} />}>
						You've liked this item (or placed a bid on it - a bid
						likes it automatically).
					</HelpRow>
					<HelpRow icon={<HeartBrokenRounded sx={{ color: 'var(--color-heart)' }} />}>
						You liked or bid on this item, and have since been
						outbid.
					</HelpRow>
					<HelpRow
						icon={
							<div
								className="material-icons"
								style={{
									fontFamily: 'Material Icons',
									fontSize: 24,
									color: 'var(--colour-bookmark)',
								}}
							>
								bookmark
							</div>
						}
					>
						Remember your place in a long list - items above your
						bookmark are dimmed as already seen.
					</HelpRow>
					<HelpRow icon={<StarBorderRounded color="warning" />}>
						Add a game to your wishlist, or (filled in) remove it.
					</HelpRow>
					<HelpRow icon={<ExpandMoreRounded />}>
						On the Wishlist tab, show or hide a game's current
						auction listings inline.
					</HelpRow>
				</div>
			</Stack>

			<Divider />

			<Typography variant="body2" paddingInline="1rem" paddingBlock="1.5rem">
				Questions, feedback, or found a bug? See the{' '}
				<Link
					href="https://boardgamegeek.com/thread/3753367/auction-tool-2026-discussion-thread"
					target="_blank"
					rel="noopener noreferrer"
				>
					discussion thread on BoardGameGeek
				</Link>
				.
			</Typography>
		</Container>
	);
};
