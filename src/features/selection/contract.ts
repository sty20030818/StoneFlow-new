/** Collection 交互窄契约，避免跨 feature 消费 selection 的壳层装配。 */
export { createCollectionFocusBridge } from './model/collectionFocusBridge'
export {
	useCollectionInteraction,
	type CollectionInteraction,
} from './model/useCollectionInteraction'
