import { useTranslation } from 'react-i18next';
import deliveryI18n from './index';

/**
 * Delivery-panel translation hook.
 *
 * Re-renders the component when the delivery language changes, and returns a
 * `t` that is a STABLE function resolving against the live delivery instance.
 * That keeps strings correct inside long-lived closures (socket handlers,
 * useCallback([]) notification builders) that would otherwise keep a `t`
 * bound to the language active when they were created.
 */
const stableT = (key, options) => deliveryI18n.t(key, options);

export const useDeliveryTranslation = () => {
    const { i18n } = useTranslation(undefined, { i18n: deliveryI18n });
    return { t: stableT, i18n };
};

export default useDeliveryTranslation;
