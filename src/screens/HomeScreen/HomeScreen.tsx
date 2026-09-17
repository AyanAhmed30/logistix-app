import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/auth';
import { FadeIn, FloatText } from '@/components/ui';
import { APP_NAME } from '@/constants';
import { AUTH_ROUTES } from '@/navigation/routes';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';

const homeBg = require('../../../assets/backgrounds/home-containers.jpg');

const JOURNEY = [
  {
    title: 'Request',
    body: 'Share cargo details in minutes',
    icon: 'create-outline' as const,
  },
  {
    title: 'Quote',
    body: 'Review and approve with clarity',
    icon: 'document-text-outline' as const,
  },
  {
    title: 'Track',
    body: 'Follow every warehouse milestone',
    icon: 'navigate-outline' as const,
  },
  {
    title: 'Deliver',
    body: 'Arrive with full visibility',
    icon: 'checkmark-done-outline' as const,
  },
];

const PILLARS = [
  {
    title: 'Live status',
    body: 'Plain-language updates instead of WhatsApp guesswork.',
    icon: 'pulse-outline' as const,
    tint: '#00A8A8',
  },
  {
    title: 'Global freight',
    body: 'Built for importers and exporters who move at scale.',
    icon: 'globe-outline' as const,
    tint: '#F59E0B',
  },
  {
    title: 'Secure access',
    body: 'Phone-linked accounts tied to your Customer ID.',
    icon: 'shield-checkmark-outline' as const,
    tint: '#38BDF8',
  },
];

const MARQUEE = [
  'Sea freight',
  'Quotes',
  'Warehouse',
  'Tracking',
  'Documents',
  'Support',
  'CBM',
  'Dispatch',
];

/** Fade / slide up as the block enters the viewport while scrolling. */
function ScrollReveal({
  scrollY,
  viewportHeight,
  children,
  style,
  shift = 42,
}: {
  scrollY: Animated.Value;
  viewportHeight: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  shift?: number;
}) {
  const [layoutY, setLayoutY] = useState<number | null>(null);

  const alreadyVisible = layoutY != null && layoutY < viewportHeight - 120;
  const enterStart = layoutY == null ? 0 : Math.max(0, layoutY - viewportHeight + 80);
  const enterEnd = layoutY == null ? 1 : Math.max(enterStart + 80, layoutY - viewportHeight + 260);

  const opacity =
    layoutY == null
      ? 0
      : alreadyVisible
        ? 1
        : scrollY.interpolate({
            inputRange: [enterStart, enterEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });

  const translateY =
    layoutY == null
      ? shift
      : alreadyVisible
        ? 0
        : scrollY.interpolate({
            inputRange: [enterStart, enterEnd],
            outputRange: [shift, 0],
            extrapolate: 'clamp',
          });

  const scale =
    layoutY == null
      ? 0.96
      : alreadyVisible
        ? 1
        : scrollY.interpolate({
            inputRange: [enterStart, enterEnd],
            outputRange: [0.96, 1],
            extrapolate: 'clamp',
          });

  return (
    <Animated.View
      onLayout={(e) => setLayoutY(e.nativeEvent.layout.y)}
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function MarqueeRow() {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -280,
        duration: 12000,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [x]);

  const chips = [...MARQUEE, ...MARQUEE];

  return (
    <View style={styles.marqueeClip}>
      <Animated.View style={[styles.marqueeRow, { transform: [{ translateX: x }] }]}>
        {chips.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.marqueeChip}>
            <FloatText style={styles.marqueeText}>{label}</FloatText>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const bgTranslateY = scrollY.interpolate({
    inputRange: [0, 700],
    outputRange: [0, -110],
    extrapolate: 'clamp',
  });
  const bgScale = scrollY.interpolate({
    inputRange: [0, 700],
    outputRange: [1.12, 1],
    extrapolate: 'clamp',
  });
  const headerElevate = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const heroParallaxY = scrollY.interpolate({
    inputRange: [0, 320],
    outputRange: [0, -48],
    extrapolate: 'clamp',
  });
  const heroFade = scrollY.interpolate({
    inputRange: [0, 260],
    outputRange: [1, 0.25],
    extrapolate: 'clamp',
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <View style={styles.root}>
      {/* Parallax logistics backdrop (same overlays as signup/login) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgParallax,
          {
            width,
            height: height + 160,
            transform: [{ translateY: bgTranslateY }, { scale: bgScale }],
          },
        ]}
      >
        <ImageBackground source={homeBg} style={styles.bgImage} resizeMode="cover">
          {/* Soft black transparent fade */}
          <View style={styles.bgBlackFade} />
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.28)', 'rgba(0, 0, 0, 0.14)', 'rgba(0, 0, 0, 0.22)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255, 170, 80, 0.08)', 'transparent']}
            start={{ x: 0, y: 0.15 }}
            end={{ x: 1, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Animated.View
            pointerEvents="none"
            style={[styles.headerFill, { opacity: headerElevate }]}
          />
          <View style={styles.header}>
            <AppLogo size="sm" />
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push(AUTH_ROUTES.login)}
                style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}
              >
                <FloatText style={styles.ghostBtnText}>Login</FloatText>
              </Pressable>
              <Pressable
                onPress={() => router.push(AUTH_ROUTES.signup)}
                style={({ pressed }) => [styles.solidBtn, pressed && { opacity: 0.9 }]}
              >
                <FloatText style={styles.solidBtnText}>Signup</FloatText>
              </Pressable>
            </View>
          </View>
        </View>

        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
        >
          <FadeIn>
            <Animated.View
              style={{
                opacity: heroFade,
                transform: [{ translateY: heroParallaxY }],
              }}
            >
              <View style={styles.heroPanel}>
                <View style={styles.livePill}>
                  <Animated.View
                    style={[
                      styles.liveRing,
                      { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                    ]}
                  />
                  <View style={styles.liveDot} />
                  <FloatText style={styles.liveText}>Freight in motion</FloatText>
                </View>

                <FloatText style={styles.heroEyebrow}>{APP_NAME}</FloatText>
                <FloatText style={styles.heroTitle} lift={7}>
                  Move cargo.{'\n'}
                  <Text style={styles.heroTitleAccent}>See everything.</Text>
                </FloatText>
                <FloatText style={styles.heroSubtitle}>
                  The customer portal for requests, quotes, and warehouse milestones — built for
                  teams who ship worldwide.
                </FloatText>

                <View style={styles.heroActions}>
                  <Pressable
                    onPress={() => router.push(AUTH_ROUTES.signup)}
                    style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.9 }]}
                  >
                    <FloatText style={styles.primaryCtaText}>Start free</FloatText>
                    <Ionicons name="arrow-forward" size={18} color={colors.white} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(AUTH_ROUTES.login)}
                    style={({ pressed }) => [styles.secondaryCta, pressed && { opacity: 0.88 }]}
                  >
                    <FloatText style={styles.secondaryCtaText}>Sign in</FloatText>
                  </Pressable>
                </View>

                <View style={styles.statStrip}>
                  <View style={styles.statItem}>
                    <FloatText style={styles.statValue} lift={6}>
                      24/7
                    </FloatText>
                    <FloatText style={styles.statLabel}>visibility</FloatText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <FloatText style={styles.statValue} lift={6}>
                      1 ID
                    </FloatText>
                    <FloatText style={styles.statLabel}>phone login</FloatText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <FloatText style={styles.statValue} lift={6}>
                      Live
                    </FloatText>
                    <FloatText style={styles.statLabel}>milestones</FloatText>
                  </View>
                </View>
              </View>
            </Animated.View>
          </FadeIn>

          <ScrollReveal scrollY={scrollY} viewportHeight={height} shift={28}>
            <MarqueeRow />
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} viewportHeight={height}>
            <View style={styles.sectionBlock}>
              <FloatText style={styles.sectionLabel}>YOUR JOURNEY</FloatText>
              <FloatText style={styles.sectionHeadline} lift={6}>
                From request to delivery
              </FloatText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width * 0.72 + spacing.md}
                contentContainerStyle={styles.journeyRail}
              >
                {JOURNEY.map((step, index) => (
                  <View key={step.title} style={[styles.journeyCard, { width: width * 0.72 }]}>
                    <LinearGradient
                      colors={['#00A8A8', '#0B1F3A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.journeyGradient}
                    >
                      <FloatText style={styles.journeyIndex}>0{index + 1}</FloatText>
                      <View style={styles.journeyIcon}>
                        <Ionicons name={step.icon} size={26} color={colors.accent} />
                      </View>
                      <FloatText style={styles.journeyTitle} lift={6}>
                        {step.title}
                      </FloatText>
                      <FloatText style={styles.journeyBody}>{step.body}</FloatText>
                      {index < JOURNEY.length - 1 ? (
                        <View style={styles.journeyTrail}>
                          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.5)" />
                        </View>
                      ) : null}
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} viewportHeight={height} shift={36}>
            <View style={styles.statementBand}>
              <FloatText style={styles.statementQuote} lift={6}>
                “Stop chasing updates. Watch your freight story unfold in one place.”
              </FloatText>
              <FloatText style={styles.statementMeta}>Designed for Logistix customers</FloatText>
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} viewportHeight={height}>
            <View style={styles.sectionBlock}>
              <FloatText style={styles.sectionLabel}>WHY LOGISTIX</FloatText>
              <FloatText style={styles.sectionHeadline} lift={6}>
                Built for serious shippers
              </FloatText>
              <View style={styles.pillarStack}>
                {PILLARS.map((item) => (
                  <Pressable
                    key={item.title}
                    style={({ pressed }) => [styles.pillarRow, pressed && { opacity: 0.92 }]}
                  >
                    <View style={[styles.pillarAccent, { backgroundColor: item.tint }]} />
                    <View style={styles.pillarIconWrap}>
                      <Ionicons name={item.icon} size={24} color={item.tint} />
                    </View>
                    <View style={styles.pillarCopy}>
                      <FloatText style={styles.pillarTitle} lift={5}>
                        {item.title}
                      </FloatText>
                      <FloatText style={styles.pillarBody}>{item.body}</FloatText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollReveal>

          <ScrollReveal scrollY={scrollY} viewportHeight={height} shift={48}>
            <LinearGradient
              colors={['#00A8A8', '#0B1F3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finalCta}
            >
              <FloatText style={styles.finalTitle} lift={6}>
                Ready to take control of your freight?
              </FloatText>
              <FloatText style={styles.finalBody}>
                Create your account with your Pakistan mobile number and step into Logistix.
              </FloatText>
              <Pressable
                onPress={() => router.push(AUTH_ROUTES.signup)}
                style={({ pressed }) => [styles.finalBtn, pressed && { opacity: 0.92 }]}
              >
                <FloatText style={styles.finalBtnText}>Create account</FloatText>
              </Pressable>
              <Pressable onPress={() => router.push(AUTH_ROUTES.login)} hitSlop={8}>
                <FloatText style={styles.finalLink}>Already shipping with us? Sign in</FloatText>
              </Pressable>
            </LinearGradient>
          </ScrollReveal>

          <View style={{ height: spacing.huge }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B4F72',
    overflow: 'hidden',
  },
  bgParallax: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgBlackFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  headerBar: {
    zIndex: 3,
    position: 'relative',
  },
  headerFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 40, 70, 0.88)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghostBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  ghostBtnText: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
  },
  solidBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    ...shadows.glow,
  },
  solidBtnText: {
    ...typography.label,
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.xxxl,
    paddingTop: spacing.md,
  },
  /** Same frosted glass as signup/login formCard */
  heroPanel: {
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    ...shadows.lg,
    zIndex: 2,
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'visible',
  },
  liveRing: {
    position: 'absolute',
    left: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  liveText: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: colors.text,
  },
  heroTitleAccent: {
    color: colors.accentDark,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    ...shadows.glow,
  },
  primaryCtaText: {
    ...typography.label,
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryCta: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryCtaText: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  marqueeClip: {
    overflow: 'hidden',
  },
  marqueeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  marqueeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    ...shadows.sm,
  },
  marqueeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    letterSpacing: 1.6,
    paddingHorizontal: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sectionHeadline: {
    ...typography.h2,
    color: colors.white,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  journeyRail: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  journeyCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    ...shadows.lg,
  },
  journeyGradient: {
    minHeight: 200,
    padding: spacing.xl,
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  journeyIndex: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    fontSize: 42,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.15)',
  },
  journeyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  journeyTitle: {
    ...typography.h3,
    color: colors.white,
  },
  journeyBody: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  journeyTrail: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  statementBand: {
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    gap: spacing.md,
    ...shadows.lg,
  },
  statementQuote: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  statementMeta: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillarStack: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    overflow: 'hidden',
    ...shadows.lg,
  },
  pillarAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  pillarIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarCopy: {
    flex: 1,
    gap: 4,
  },
  pillarTitle: {
    ...typography.label,
    fontSize: 16,
    color: colors.text,
  },
  pillarBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  finalCta: {
    marginHorizontal: spacing.xl,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...shadows.lg,
  },
  finalTitle: {
    ...typography.h2,
    color: colors.white,
  },
  finalBody: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.92)',
  },
  finalBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  finalBtnText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  finalLink: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
});
