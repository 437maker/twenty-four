// ShopScreen.tsx — Full-featured cosmetic shop for the "24" habit tracker app.
// Users spend "treats" (🦴) to buy cosmetic items and stackable streak shields.
// Sprint 2: outfit, accessory, house, shield categories with owned-item tracking.

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { ShopItemDef, ShopCategory, OwnedItem } from '../types';
import { SHOP_CATALOG, getCatalogByCategory } from '../data/shopCatalog';
import {
  purchaseItem, purchaseShield, getOwnedItems, equipItem, unequipSlot, setShownHouse,
} from '../db/queries';
import Companion from '../components/companion/Companion';
import CompanionSvg from '../components/companion/CompanionSvg';
import { getHouse } from '../components/companion/houses';
import type { HouseDef } from '../components/companion/houses';
import { HouseScene, HouseStill, dogFrame } from '../components/companion/houses/HouseScene';
import { sceneFit } from '../components/companion/houses/types';
import { useReduceMotion } from '../components/companion/useReduceMotion';
import { isEquipped, isWearable, slotForItem, withItem } from '../components/companion/items/itemSlots';
import type { Equipped } from '../components/companion/items/itemSlots';
import { useCompanionLook } from '../components/companion/useCompanionLook';
import { useAppStore } from '../store/useAppStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
const PREVIEW_SIZE = 104; // the try-on picture on each wearable card
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * (NUM_COLUMNS + 2) * 2) / NUM_COLUMNS;
// The house picture on each House card (3:2, like the scene itself)...
const HOUSE_CARD_W = Math.floor(CARD_WIDTH - 28);
const HOUSE_CARD_H = Math.round((HOUSE_CARD_W * 2) / 3);
// ...and the big animated one in the preview pop-up.
const HOUSE_BIG_W = Math.min(330, Math.floor(SCREEN_WIDTH - 88));
const HOUSE_BIG_H = Math.round((HOUSE_BIG_W * 2) / 3);

const TIER_COLORS: Record<number, string> = {
  1: '#9CA3AF',
  2: '#3B82F6',
  3: '#10B981',
  4: '#8B5CF6',
  5: '#F59E0B',
};

const TIER_LABELS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

const CATEGORIES: { key: ShopCategory; label: string }[] = [
  { key: 'outfit',    label: 'Outfits'     },
  { key: 'accessory', label: 'Accessories' },
  { key: 'house',     label: 'House'       },
  { key: 'shield',    label: 'Shields'     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: number;
}
function TierBadge({ tier }: TierBadgeProps) {
  const color = TIER_COLORS[tier] ?? '#9CA3AF';
  return (
    <View style={[styles.tierBadge, { backgroundColor: color }]}>
      <Text style={styles.tierBadgeText}>T{TIER_LABELS[tier] ?? tier}</Text>
    </View>
  );
}

// A house with the user's own dog standing in front of it. Still picture:
// one SVG for the scene and one for the dog.
function HouseCardPreview({ def, breed, equipped }: { def: HouseDef; breed: string; equipped: Equipped }) {
  const box = useMemo(() => dogFrame(sceneFit(HOUSE_CARD_W, HOUSE_CARD_H), def.dog), [def]);
  return (
    <View style={styles.housePreview}>
      <HouseStill def={def} width={HOUSE_CARD_W} height={HOUSE_CARD_H} />
      <View style={{ position: 'absolute', left: box.left, top: box.top }} pointerEvents="none">
        <CompanionSvg state="idle" size={box.size} breed={breed} equipped={equipped} />
      </View>
    </View>
  );
}

// The big preview: the animated scene with the animated dog in front of it,
// so a house can be tried before it is bought.
interface HousePreviewModalProps {
  item: ShopItemDef | null;
  isOwned: boolean;
  isShown: boolean;
  breed: string;
  equipped: Equipped;
  onClose: () => void;
  onBuy: (item: ShopItemDef) => void;
  onShow: (item: ShopItemDef) => void;
}
function HousePreviewModal({ item, isOwned, isShown, breed, equipped, onClose, onBuy, onShow }: HousePreviewModalProps) {
  const reduceMotion = useReduceMotion();
  const def = item ? getHouse(item.id) : null;
  if (!item || !def) return null;
  const box = dogFrame(sceneFit(HOUSE_BIG_W, HOUSE_BIG_H), def.dog);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard} testID="shop-house-preview-modal">
          <View style={[styles.housePreview, { width: HOUSE_BIG_W, height: HOUSE_BIG_H, marginTop: 0 }]}>
            <HouseScene def={def} width={HOUSE_BIG_W} height={HOUSE_BIG_H} reduceMotion={reduceMotion} />
            <View style={{ position: 'absolute', left: box.left, top: box.top }} pointerEvents="none">
              <Companion state="happy" size={box.size} breed={breed} equipped={equipped} reduceMotion={reduceMotion} interactive={false} label={`Your dog at the ${item.name}`} />
            </View>
          </View>
          <Text style={[styles.modalItemName, { marginTop: 14 }]}>{item.name}</Text>
          <Text style={styles.modalItemDescription}>{item.description}</Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close preview">
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
            {!isOwned ? (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => onBuy(item)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Buy ${item.name} for ${item.price} treats`}
                testID="shop-house-preview-buy"
              >
                <Text style={styles.confirmButtonText}>Buy  🦴 {item.price}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => onShow(item)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isShown ? `${item.name} is shown in the yard` : `Show ${item.name} in the yard`}
                testID="shop-house-preview-show"
              >
                <Text style={styles.confirmButtonText}>{isShown ? '✓ In yard' : 'Show in yard'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ItemCardProps {
  item: ShopItemDef;
  isOwned: boolean;
  onPress: (item: ShopItemDef) => void;        // Buy
  // Wearables (outfits and accessories):
  breed: string;
  equipped: Equipped;                           // what she is wearing now
  onWear: (item: ShopItemDef) => void;
  onTakeOff: (item: ShopItemDef) => void;
  // Houses:
  isShownHouse: boolean;
  onShowHouse: (item: ShopItemDef) => void;
  onPreviewHouse: (item: ShopItemDef) => void;   // open the big animated preview
}
function ItemCard({
  item, isOwned, onPress, breed, equipped, onWear, onTakeOff, isShownHouse, onShowHouse, onPreviewHouse,
}: ItemCardProps) {
  const wearable = isWearable(item.id);
  const house = item.category === 'house' ? getHouse(item.id) : null;
  const wearing = wearable && isEquipped(equipped, item.id);
  // Try-on: the dog as she is now, with this item put on (owned or not).
  const tryOn = useMemo(() => (wearable ? withItem(equipped, item.id) : equipped), [wearable, equipped, item.id]);

  return (
    <View style={styles.card}>
      <TierBadge tier={item.tier} />
      {wearable ? (
        <View
          style={styles.cardPreview}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Your dog wearing the ${item.name}`}
        >
          <CompanionSvg state="idle" size={PREVIEW_SIZE} breed={breed} equipped={tryOn} />
        </View>
      ) : house ? (
        <TouchableOpacity
          onPress={() => onPreviewHouse(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} with your dog in front of it. Tap for a bigger preview.`}
          testID={`shop-house-preview-${item.id}`}
        >
          <HouseCardPreview def={house} breed={breed} equipped={equipped} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.cardEmoji}>{item.emoji}</Text>
      )}
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
      <View style={styles.cardPriceRow}>
        <Text style={styles.cardPrice}>🦴 {item.price}</Text>
      </View>
      {!isOwned ? (
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => onPress(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Buy ${item.name} for ${item.price} treats`}
        >
          <Text style={styles.buyButtonText}>Buy</Text>
        </TouchableOpacity>
      ) : wearable ? (
        <TouchableOpacity
          style={[styles.buyButton, wearing ? styles.takeOffButton : styles.wearButton]}
          onPress={() => (wearing ? onTakeOff(item) : onWear(item))}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={wearing ? `Take off ${item.name}` : `Wear ${item.name}`}
          testID={`shop-wear-${item.id}`}
        >
          <Text style={[styles.buyButtonText, wearing && styles.takeOffButtonText]}>
            {wearing ? 'Take off' : 'Wear'}
          </Text>
        </TouchableOpacity>
      ) : item.category === 'house' ? (
        <TouchableOpacity
          style={[styles.buyButton, isShownHouse ? styles.takeOffButton : styles.wearButton]}
          onPress={() => onShowHouse(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: isShownHouse }}
          accessibilityLabel={isShownHouse ? `${item.name} is shown in the yard. Tap to go back to your best house.` : `Show ${item.name} in the yard`}
          testID={`shop-house-${item.id}`}
        >
          <Text style={[styles.buyButtonText, isShownHouse && styles.takeOffButtonText]}>
            {isShownHouse ? '✓ In yard' : 'Show in yard'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedBadgeText}>✓ Owned</Text>
        </View>
      )}
    </View>
  );
}

// Shield card differs: always shows Buy (stackable, no owned check)
interface ShieldCardProps {
  item: ShopItemDef;
  onPress: (item: ShopItemDef) => void;
}
function ShieldCard({ item, onPress }: ShieldCardProps) {
  return (
    <View style={styles.card}>
      <TierBadge tier={item.tier} />
      <Text style={styles.cardEmoji}>{item.emoji}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
      <View style={styles.cardPriceRow}>
        <Text style={styles.cardPrice}>🦴 {item.price}</Text>
      </View>
      <TouchableOpacity
        style={styles.buyButton}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Purchase confirmation modal ──────────────────────────────────────────────

interface PurchaseModalProps {
  item: ShopItemDef | null;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isPurchasing: boolean;
  purchaseSuccess: boolean;
  onWearNow: () => void;   // wearables only: put the new item straight on
  onDone: () => void;      // close after a purchase
}
function PurchaseModal({
  item,
  visible,
  onCancel,
  onConfirm,
  isPurchasing,
  purchaseSuccess,
  onWearNow,
  onDone,
}: PurchaseModalProps) {
  if (!item) return null;
  const wearable = isWearable(item.id);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {purchaseSuccess ? (
            <View style={styles.modalSuccessContainer}>
              <Text style={styles.modalSuccessEmoji}>🎉</Text>
              <Text style={styles.modalSuccessText}>Purchased!</Text>
              {wearable && (
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onDone}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Not now"
                  >
                    <Text style={styles.cancelButtonText}>Not now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={onWearNow}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Wear ${item.name} now`}
                    testID="shop-wear-now"
                  >
                    <Text style={styles.confirmButtonText}>Wear now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.modalItemEmoji}>{item.emoji}</Text>
              <Text style={styles.modalItemName}>{item.name}</Text>
              <Text style={styles.modalItemDescription}>{item.description}</Text>
              <View style={styles.modalPriceRow}>
                <Text style={styles.modalPriceLabel}>Price:</Text>
                <Text style={styles.modalPriceValue}>🦴 {item.price}</Text>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={isPurchasing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, isPurchasing && styles.confirmButtonDisabled]}
                  onPress={onConfirm}
                  disabled={isPurchasing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {isPurchasing ? 'Buying…' : 'Confirm Purchase'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Shields info card ────────────────────────────────────────────────────────

function ShieldInfoCard() {
  return (
    <View style={styles.shieldInfoCard}>
      <Text style={styles.shieldInfoTitle}>ℹ️  About Shields</Text>
      <Text style={styles.shieldInfoText}>
        Shields protect your streak if you miss a day. They are stackable — each
        shield is consumed automatically once when your streak would otherwise
        reset. Stock up to keep your streak safe!
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { settings, refreshTreatCount, loadSettings } = useAppStore();
  const look = useCompanionLook();          // breed + what she is wearing
  const shownHouse = settings?.shown_house ?? null;

  const [activeCategory, setActiveCategory] = useState<ShopCategory>('outfit');
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ShopItemDef | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [previewHouse, setPreviewHouse] = useState<ShopItemDef | null>(null); // the big house preview

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Treat & shield counts sourced from store
  const treatCount = settings?.treat_count ?? 0;
  const shieldsOwned = settings?.shields_owned ?? 0;

  // Load owned items whenever the screen gains focus
  const loadOwned = useCallback(async () => {
    try {
      const items = await getOwnedItems();
      setOwnedItems(items);
    } catch {
      // Silently fail — owned state will just not reflect until next focus
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOwned();
      refreshTreatCount();

      return () => {
        // Cleanup success timeout if screen loses focus mid-animation
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
      };
    }, [loadOwned, refreshTreatCount])
  );

  // Derive a Set of owned item IDs for O(1) lookup
  const ownedItemIds = new Set(ownedItems.map((o) => o.item_id));

  // Items for current category
  const catalogItems = getCatalogByCategory(activeCategory);

  // ── Open purchase modal ───────────────────────────────────────────────────
  const handleBuyPress = (item: ShopItemDef) => {
    setSelectedItem(item);
    setPurchaseSuccess(false);
    setModalVisible(true);
  };

  // ── Cancel modal ──────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (isPurchasing) return;
    setModalVisible(false);
    setSelectedItem(null);
  };

  // ── Confirm purchase ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedItem || isPurchasing) return;

    setIsPurchasing(true);
    try {
      let success: boolean;

      if (selectedItem.category === 'shield') {
        success = await purchaseShield(selectedItem.price);
      } else {
        success = await purchaseItem(
          selectedItem.id,
          selectedItem.price,
          selectedItem.name
        );
      }

      if (!success) {
        setIsPurchasing(false);
        setModalVisible(false);
        setSelectedItem(null);
        Alert.alert(
          'Not enough treats!',
          `You need 🦴 ${selectedItem.price} treats to buy ${selectedItem.name}.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Success path
      setPurchaseSuccess(true);
      await refreshTreatCount();
      await loadOwned();

      if (isWearable(selectedItem.id)) {
        // Wearables wait for "Wear now" or "Not now" instead of closing by themselves.
        setIsPurchasing(false);
      } else {
        successTimeoutRef.current = setTimeout(() => {
          setModalVisible(false);
          setSelectedItem(null);
          setPurchaseSuccess(false);
          setIsPurchasing(false);
        }, 1200);
      }
    } catch {
      setIsPurchasing(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // ── Wear / take off / show house ───────────────────────────────────────────
  // Each handler changes the database, then reloads settings so every screen
  // showing the dog (and the yard) picks up the change.
  const handleWear = useCallback(async (item: ShopItemDef) => {
    const slot = slotForItem(item.id);
    if (!slot) return;
    try {
      await equipItem(slot, item.id);
      await loadSettings();
    } catch {
      Alert.alert('Error', 'Could not put that on. Please try again.');
    }
  }, [loadSettings]);

  const handleTakeOff = useCallback(async (item: ShopItemDef) => {
    const slot = slotForItem(item.id);
    if (!slot) return;
    try {
      await unequipSlot(slot);
      await loadSettings();
    } catch {
      Alert.alert('Error', 'Could not take that off. Please try again.');
    }
  }, [loadSettings]);

  // Tapping the house that is already shown goes back to "best house I own".
  const handleShowHouse = useCallback(async (item: ShopItemDef) => {
    try {
      await setShownHouse(shownHouse === item.id ? null : item.id);
      await loadSettings();
    } catch {
      Alert.alert('Error', 'Could not change the yard. Please try again.');
    }
  }, [loadSettings, shownHouse]);

  const closePurchaseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setPurchaseSuccess(false);
    setIsPurchasing(false);
  };

  const handleWearNow = async () => {
    const item = selectedItem;
    closePurchaseModal();
    if (item) await handleWear(item);
  };

  // ── FlatList render item ──────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ShopItemDef }) => {
      if (item.category === 'shield') {
        return <ShieldCard item={item} onPress={handleBuyPress} />;
      }
      return (
        <ItemCard
          item={item}
          isOwned={ownedItemIds.has(item.id)}
          onPress={handleBuyPress}
          breed={look.breed}
          equipped={look.equipped}
          onWear={handleWear}
          onTakeOff={handleTakeOff}
          isShownHouse={shownHouse === item.id}
          onShowHouse={handleShowHouse}
          onPreviewHouse={setPreviewHouse}
        />
      );
    },
    [ownedItemIds, look, shownHouse, handleWear, handleTakeOff, handleShowHouse]
  );

  const keyExtractor = (item: ShopItemDef) => item.id;

  // Optional header component for shields category
  const ListHeaderComponent =
    activeCategory === 'shield' ? <ShieldInfoCard /> : undefined;

  // Spacer item for FlatList when odd number of cards
  const dataWithSpacer = catalogItems.length % 2 !== 0
    ? [...catalogItems, { id: '__spacer__', category: activeCategory, name: '', description: '', price: 0, tier: 1, emoji: '' } as ShopItemDef]
    : catalogItems;

  const renderItemWithSpacer = useCallback(
    ({ item }: { item: ShopItemDef }) => {
      if (item.id === '__spacer__') {
        return <View style={[styles.card, styles.cardInvisible]} />;
      }
      if (item.category === 'shield') {
        return <ShieldCard item={item} onPress={handleBuyPress} />;
      }
      return (
        <ItemCard
          item={item}
          isOwned={ownedItemIds.has(item.id)}
          onPress={handleBuyPress}
          breed={look.breed}
          equipped={look.equipped}
          onWear={handleWear}
          onTakeOff={handleTakeOff}
          isShownHouse={shownHouse === item.id}
          onShowHouse={handleShowHouse}
          onPreviewHouse={setPreviewHouse}
        />
      );
    },
    [ownedItemIds, look, shownHouse, handleWear, handleTakeOff, handleShowHouse]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#3C3489', '#5B4FBE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Shop</Text>

        {/* Treat & Shield badges */}
        <View style={styles.headerBadges}>
          <View style={styles.treatBadge}>
            <Text style={styles.treatBadgeText}>🦴 {treatCount}</Text>
          </View>
          {shieldsOwned > 0 && (
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldBadgeText}>🛡️ {shieldsOwned}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Category tabs ────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={styles.tab}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {cat.label}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Item grid ────────────────────────────────────────────────────────── */}
      <FlatList
        key={activeCategory}
        data={dataWithSpacer}
        keyExtractor={keyExtractor}
        renderItem={renderItemWithSpacer}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeaderComponent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={5}
      />

      {/* ── House preview (animated scene + your dog) ────────────────────────── */}
      {previewHouse && (
        <HousePreviewModal
          item={previewHouse}
          isOwned={ownedItemIds.has(previewHouse.id)}
          isShown={shownHouse === previewHouse.id}
          breed={look.breed}
          equipped={look.equipped}
          onClose={() => setPreviewHouse(null)}
          onBuy={(item) => {
            setPreviewHouse(null);
            handleBuyPress(item);
          }}
          onShow={(item) => {
            setPreviewHouse(null);
            if (shownHouse !== item.id) handleShowHouse(item);
          }}
        />
      )}

      {/* ── Purchase modal ───────────────────────────────────────────────────── */}
      <PurchaseModal
        item={selectedItem}
        visible={modalVisible}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        isPurchasing={isPurchasing}
        purchaseSuccess={purchaseSuccess}
        onWearNow={handleWearNow}
        onDone={closePurchaseModal}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  treatBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  treatBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706', // amber-600
  },
  shieldBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shieldBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Category tabs ────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#3C3489',
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3C3489',
  },

  // ── Item grid ────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // ── Item card ────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    margin: CARD_MARGIN,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardPreview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 16,
    backgroundColor: '#EAF3FC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  housePreview: {
    width: HOUSE_CARD_W,
    height: HOUSE_CARD_H,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EAF3FC',
  },
  wearButton: {
    backgroundColor: '#1D9E75',
  },
  takeOffButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3C3489',
  },
  takeOffButtonText: {
    color: '#3C3489',
  },
  cardInvisible: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardEmoji: {
    fontSize: 44,
    marginTop: 8,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },
  cardPriceRow: {
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },

  // ── Tier badge ───────────────────────────────────────────────────────────────
  tierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Buy button ───────────────────────────────────────────────────────────────
  buyButton: {
    backgroundColor: '#3C3489',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 7,
    width: '100%',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Owned badge ──────────────────────────────────────────────────────────────
  ownedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  ownedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },

  // ── Shield info card ─────────────────────────────────────────────────────────
  shieldInfoCard: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  shieldInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
  },
  shieldInfoText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },

  // ── Purchase modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalItemEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  modalItemName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
    gap: 8,
  },
  modalPriceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  modalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#3C3489',
  },
  confirmButtonDisabled: {
    backgroundColor: '#8B85BE',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Purchase success state ───────────────────────────────────────────────────
  modalSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalSuccessEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  modalSuccessText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#059669',
  },
});
