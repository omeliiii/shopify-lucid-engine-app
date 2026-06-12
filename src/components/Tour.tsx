import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EVENTS, ORIGIN, useJoyride, type Step, type Controls } from 'react-joyride';
import { Modal, Text, BlockStack, Button, InlineStack } from '@shopify/polaris';
import { useTour, nextStage } from '../contexts/TourProvider';
import type { TourStage } from '../utils/tourApi';

// ── Route mapping per stage ────────────────────────────────────────────────────

const ROUTE_BY_STAGE: Record<TourStage, string> = {
  welcome: '/',
  inventory: '/inventory',
  mapping: '/mapping',
  shipping_rules: '/shipping-rules',
  backfill: '/',
  completed: '/',
};

// ── Step content renderer ──────────────────────────────────────────────────────

interface StepBodyProps {
  title: string;
  body: string;
  onDismissForever: () => void;
  dismissLabel: string;
}

function StepBody({ title, body, onDismissForever, dismissLabel }: StepBodyProps) {
  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingMd">{title}</Text>
      <Text as="p" variant="bodyMd">
        {body.split('\n').map((line, i) => (
          <span key={i} style={{ display: 'block' }}>{line}</span>
        ))}
      </Text>
      <InlineStack align="end">
        <Button variant="plain" tone="critical" onClick={onDismissForever}>
          {dismissLabel}
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

// ── Per-stage step factories ───────────────────────────────────────────────────

type TFn = (key: string, opts?: Record<string, unknown>) => string;

interface BuildStepsCtx {
  t: TFn;
  onDismissForever: () => void;
  todayLabel: string;
  /** On mobile the nav sidebar is collapsed behind the TopBar hamburger. */
  isMobile: boolean;
}

function buildWelcomeSteps({ t, onDismissForever, isMobile }: BuildStepsCtx): Step[] {
  const dismissLabel = t('buttons.dismiss_forever');
  return [
    {
      target: 'body',
      placement: 'center',
      content: (
        <StepBody
          title={t('welcome.intro.title')}
          body={t('welcome.intro.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      // On desktop the Reports link sits in the always-visible sidebar. On
      // mobile that sidebar is collapsed off-canvas behind the TopBar
      // hamburger, so highlight the hamburger instead and tell the user to
      // open the menu.
      target: isMobile ? '.Polaris-TopBar__NavigationIcon' : 'a[href="/reports"]',
      placement: isMobile ? 'bottom' : 'auto',
      content: (
        <StepBody
          title={t('welcome.reports.title')}
          body={t(isMobile ? 'welcome.reports.body_mobile' : 'welcome.reports.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="checklist"]',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('welcome.checklist.title')}
          body={t('welcome.checklist.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      locale: { last: t('buttons.open_inventory') },
    },
  ];
}

function buildInventorySteps({ t, onDismissForever }: BuildStepsCtx): Step[] {
  const dismissLabel = t('buttons.dismiss_forever');
  return [
    {
      target: '.Polaris-Page-Header__PrimaryActionWrapper',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('inventory.intro.title')}
          body={t('inventory.intro.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      data: { advanceOnTargetClick: true },
    },
    {
      target: '[data-tour="inventory-modal-categories-anchor"]',
      spotlightTarget: '[data-tour="inventory-modal-categories"]',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('inventory.categories.title')}
          body={t('inventory.categories.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="inventory-items-anchor"]',
      spotlightTarget: '[data-tour="inventory-items"]',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('inventory.add_items.title')}
          body={t('inventory.add_items.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: 'body',
      placement: 'center',
      content: (
        <StepBody
          title={t('inventory.next.title')}
          body={t('inventory.next.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      locale: { last: t('buttons.open_mapping') },
    },
  ];
}

function buildMappingSteps({ t, onDismissForever }: BuildStepsCtx): Step[] {
  const dismissLabel = t('buttons.dismiss_forever');
  return [
    {
      target: '[data-tour="mapping-table-anchor"]',
      spotlightTarget: '[data-tour="mapping-table"]',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('mapping.intro.title')}
          body={t('mapping.intro.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="mapping-table-anchor"]',
      spotlightTarget: '[data-tour="mapping-table"]',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('mapping.row_add.title')}
          body={t('mapping.row_add.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '.Polaris-ActionMenu-Actions__ActionsLayout .Polaris-ActionMenu-SecondaryAction',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('mapping.bulk.title')}
          body={t('mapping.bulk.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      data: { advanceOnTargetClick: true },
    },
    {
      target: 'body',
      placement: 'center',
      content: (
        <StepBody
          title={t('mapping.next.title')}
          body={t('mapping.next.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      locale: { last: t('buttons.open_rules') },
    },
  ];
}

function buildShippingRulesSteps({ t, onDismissForever }: BuildStepsCtx): Step[] {
  const dismissLabel = t('buttons.dismiss_forever');
  return [
    {
      target: '.Polaris-Page-Header__PrimaryActionWrapper',
      placement: 'bottom',
      content: (
        <StepBody
          title={t('shipping_rules.intro.title')}
          body={t('shipping_rules.intro.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      data: { advanceOnTargetClick: true },
    },
    {
      target: '[data-tour="rules-modal-name"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_name.title')}
          body={t('shipping_rules.modal_name.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="rules-modal-range"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_range.title')}
          body={t('shipping_rules.modal_range.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="rules-modal-group"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_group.title')}
          body={t('shipping_rules.modal_group.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="rules-modal-secondary"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_secondary.title')}
          body={t('shipping_rules.modal_secondary.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="rules-modal-filler"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_filler.title')}
          body={t('shipping_rules.modal_filler.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '[data-tour="rules-modal-tape"]',
      placement: 'auto',
      content: (
        <StepBody
          title={t('shipping_rules.modal_tape.title')}
          body={t('shipping_rules.modal_tape.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
    {
      target: '.Polaris-Modal-Dialog .Polaris-Button--variantPrimary',
      placement: 'top',
      content: (
        <StepBody
          title={t('shipping_rules.modal_save.title')}
          body={t('shipping_rules.modal_save.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      data: { advanceOnTargetClick: true },
    },
    {
      target: 'body',
      placement: 'center',
      content: (
        <StepBody
          title={t('shipping_rules.next.title')}
          body={t('shipping_rules.next.body')}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
      locale: { last: t('buttons.back_to_dashboard') },
    },
  ];
}

function buildBackfillSteps({ t, onDismissForever, todayLabel }: BuildStepsCtx): Step[] {
  const dismissLabel = t('buttons.dismiss_forever');
  return [
    {
      target: '[data-tour="checklist-item-backfill"]',
      placement: 'top',
      content: (
        <StepBody
          title={t('backfill.intro.title')}
          body={t('backfill.intro.body', { today: todayLabel })}
          onDismissForever={onDismissForever}
          dismissLabel={dismissLabel}
        />
      ),
      skipBeacon: true,
    },
  ];
}

function buildCompletedSteps({ t, onDismissForever }: BuildStepsCtx): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      content: (
        <StepBody
          title={t('completed.title')}
          body={t('completed.body')}
          onDismissForever={onDismissForever}
          dismissLabel={t('buttons.dismiss_forever')}
        />
      ),
      skipBeacon: true,
    },
  ];
}

function buildStepsForStage(stage: TourStage, ctx: BuildStepsCtx): Step[] {
  switch (stage) {
    case 'welcome': return buildWelcomeSteps(ctx);
    case 'inventory': return buildInventorySteps(ctx);
    case 'mapping': return buildMappingSteps(ctx);
    case 'shipping_rules': return buildShippingRulesSteps(ctx);
    case 'backfill': return buildBackfillSteps(ctx);
    case 'completed': return buildCompletedSteps(ctx);
  }
}

// ── Tour Component ─────────────────────────────────────────────────────────────

export default function Tour() {
  const { t, i18n } = useTranslation('tour');
  const navigate = useNavigate();
  const location = useLocation();
  const { stage, running, suspend, dismissForever, goToStage, complete } = useTour();

  const [confirmDismiss, setConfirmDismiss] = useState(false);

  // The Joyride overlay/tooltip sit at a very high z-index (see options below),
  // well above the Polaris Modal cap. If we left the tour running, the
  // confirmation Modal would render *behind* the overlay — invisible and
  // unclickable. So we pause the tour while confirming and resume it (at the
  // same step) if the user cancels.
  const controlsRef = useRef<Controls | null>(null);
  const dismissResumeIndexRef = useRef(0);

  const todayLabel = useMemo(() => {
    const locale = i18n.language || 'it';
    return new Date().toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }, [i18n.language]);

  // Track whether we're below Polaris' navigation breakpoint (md = 48em), the
  // point at which the Frame collapses the sidebar behind the TopBar hamburger.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(max-width: 47.9975em)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 47.9975em)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleDismissForever = useCallback(() => {
    const c = controlsRef.current;
    if (c) {
      dismissResumeIndexRef.current = c.info().index;
      c.stop();
    }
    setConfirmDismiss(true);
  }, []);

  const handleConfirmDismiss = useCallback(() => {
    setConfirmDismiss(false);
    dismissForever();
  }, [dismissForever]);

  const handleCancelDismiss = useCallback(() => {
    setConfirmDismiss(false);
    controlsRef.current?.start(dismissResumeIndexRef.current);
  }, []);

  // Build steps for the current stage
  const steps = useMemo(
    () => buildStepsForStage(stage, {
      t: t as TFn,
      onDismissForever: handleDismissForever,
      todayLabel,
      isMobile,
    }),
    [stage, t, handleDismissForever, todayLabel, isMobile],
  );

  // Joyride setup
  const { Tour: JoyrideTour, controls, on } = useJoyride({
    steps,
    continuous: true,
    locale: {
      next: t('buttons.next'),
      skip: t('buttons.skip'),
      close: t('buttons.close'),
      last: t('buttons.last'),
    },
    floatingOptions: {
      shiftOptions: { padding: 20 },
    },
    options: {
      arrowColor: '#ffffff',
      backgroundColor: '#ffffff',
      textColor: '#202223',
      overlayColor: 'rgba(0, 0, 0, 0.45)',
      primaryColor: '#005bd3',
      zIndex: 10000,
      buttons: ['skip', 'primary'],
      width: 340,
      targetWaitTimeout: 5000,
      blockTargetInteraction: false,
      disableFocusTrap: true,
    },
  });

  // Expose controls to the dismiss handlers (defined before useJoyride).
  controlsRef.current = controls;

  // Navigate to the stage's route before showing the tour
  useEffect(() => {
    if (!running) return;
    const target = ROUTE_BY_STAGE[stage];
    if (target && location.pathname !== target) {
      navigate(target);
    }
  }, [running, stage, location.pathname, navigate]);

  // Start the tour when running, stop when paused
  const prevStageRef = useRef<TourStage | null>(null);
  useEffect(() => {
    if (!running) {
      controls.stop();
      prevStageRef.current = null;
      return;
    }
    // Wait until we're on the correct route before kicking off — otherwise
    // selectors targeting page-specific elements will miss.
    const target = ROUTE_BY_STAGE[stage];
    if (target && location.pathname !== target) return;

    // Restart whenever the stage changes (or first start)
    if (prevStageRef.current !== stage) {
      // small delay to let the route render
      const timer = setTimeout(() => controls.start(0), 200);
      prevStageRef.current = stage;
      return () => clearTimeout(timer);
    }
  }, [running, stage, location.pathname, controls]);

  // Auto-advance when the user clicks the highlighted target (instead of
  // pressing Next) — for steps that open a modal whose fields are the focus
  // of the following step. Opt-in via Step.data.advanceOnTargetClick.
  //
  // Mirror-image case: if the user *does* press Next on such a step, the
  // next step's target lives inside a modal that's still closed, so joyride
  // would hang in the wait-for-target loader. To prevent that, we
  // programmatically click the target on Next so the modal opens too.
  const advanceSourceRef = useRef<'target_click' | null>(null);

  useEffect(() => {
    let detach: (() => void) | null = null;

    const cleanup = () => {
      detach?.();
      detach = null;
    };

    const unsubscribeTooltip = on(EVENTS.TOOLTIP, (data) => {
      cleanup();
      const stepData = data.step?.data as { advanceOnTargetClick?: boolean } | undefined;
      if (!stepData?.advanceOnTargetClick) return;

      const targetSelector = data.step?.target;
      if (typeof targetSelector !== 'string') return;

      const targetEl = document.querySelector(targetSelector) as HTMLElement | null;
      if (!targetEl) return;

      const clickable = (targetEl.matches('button, a, [role="button"]')
        ? targetEl
        : targetEl.querySelector('button, a, [role="button"]')) as HTMLElement | null;
      if (!clickable) return;

      const handleClick = () => {
        advanceSourceRef.current = 'target_click';
        // Small delay so the modal animation has a chance to start before
        // joyride looks for the next step's target.
        setTimeout(() => controls.next(), 120);
      };
      clickable.addEventListener('click', handleClick, { once: true });
      detach = () => clickable.removeEventListener('click', handleClick);
    });

    const unsubscribeAfter = on(EVENTS.STEP_AFTER, (data) => {
      const source = advanceSourceRef.current;
      advanceSourceRef.current = null;
      if (source === 'target_click') return;
      if (data.origin !== ORIGIN.BUTTON_PRIMARY) return;

      const stepData = data.step?.data as { advanceOnTargetClick?: boolean } | undefined;
      if (!stepData?.advanceOnTargetClick) return;

      // Detach the TOOLTIP-installed click listener BEFORE the programmatic
      // click — otherwise it fires too and triggers a second controls.next(),
      // skipping the following step.
      cleanup();

      const targetSelector = data.step?.target;
      if (typeof targetSelector !== 'string') return;
      const targetEl = document.querySelector(targetSelector) as HTMLElement | null;
      const clickable = (targetEl?.matches('button, a, [role="button"]')
        ? targetEl
        : targetEl?.querySelector('button, a, [role="button"]')) as HTMLElement | null;
      clickable?.click();
    });

    return () => {
      unsubscribeTooltip();
      unsubscribeAfter();
      cleanup();
    };
  }, [on, controls]);

  // React to joyride events: skip → suspend, finish → advance stage
  useEffect(() => {
    const unsubscribe = on(EVENTS.TOUR_END, (data) => {
      // SKIPPED → user pressed skip or close button
      // FINISHED → reached the last step
      if (data.status === 'skipped') {
        // Distinguish: explicit dismiss-forever flow already handled
        if (data.origin === ORIGIN.BUTTON_SKIP || data.origin === ORIGIN.BUTTON_CLOSE) {
          suspend();
        }
        return;
      }
      if (data.status === 'finished') {
        const next = nextStage(stage);
        if (next === 'completed') {
          complete();
        } else {
          goToStage(next);
        }
      }
    });
    return unsubscribe;
  }, [on, stage, suspend, complete, goToStage]);

  // Fallback when joyride can't find a step's target within targetWaitTimeout:
  // skip the missing step instead of hanging in the loader. If it's the last
  // step of the current stage, advance the stage so the user isn't stuck.
  useEffect(() => {
    const unsubscribe = on(EVENTS.TARGET_NOT_FOUND, (data) => {
      const isLast = data.index >= data.size - 1;
      if (isLast) {
        const next = nextStage(stage);
        if (next === 'completed') {
          complete();
        } else {
          goToStage(next);
        }
        return;
      }
      controls.next();
    });
    return unsubscribe;
  }, [on, controls, stage, complete, goToStage]);

  return (
    <>
      {running && JoyrideTour}
      <Modal
        open={confirmDismiss}
        onClose={handleCancelDismiss}
        title={t('confirmations.dismiss_title')}
        primaryAction={{
          content: t('confirmations.dismiss_confirm'),
          destructive: true,
          onAction: handleConfirmDismiss,
        }}
        secondaryActions={[
          { content: t('confirmations.dismiss_cancel'), onAction: handleCancelDismiss },
        ]}
      >
        <Modal.Section>
          <Text as="p">{t('confirmations.dismiss_body')}</Text>
        </Modal.Section>
      </Modal>
    </>
  );
}
