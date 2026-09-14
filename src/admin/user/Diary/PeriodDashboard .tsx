import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaBell,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaClock,
  FaHeart,
  FaInfoCircle,
  FaPlus,
  FaSave,
  FaTint,
  FaTrash,
} from "react-icons/fa";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../../firebase/config";

import { useNavigate } from "react-router-dom";

/* =========================================================
   TYPES
========================================================= */

interface PeriodCycle {
  id: string;
  userId: string;
  startDate: string;
  endDate?: string;
  periodDuration?: number;
  cycleLength?: number;
  flow?: string;
  symptoms?: string[];
  mood?: string;
  painLevel?: number;
  notes?: string;
  createdAt?: unknown;
}

interface DailyHealthLog {
  id: string;
  userId: string;
  date: string;
  symptoms?: string[];
  mood?: string;
  painLevel?: number;
  notes?: string;
}

interface PeriodProfile {
  userId: string;
  averageCycleLength: number;
  periodDuration: number;
  calculationMode: "automatic" | "manual";
  manualCycleLength?: number;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  updatedAt?: unknown;
}

type DayStatus =
  | ""
  | "period"
  | "fertile"
  | "ovulation"
  | "lower-fertility"
  | "expected";

interface PeriodDayOverride {
  id: string;
  userId: string;
  date: string;
  status: DayStatus;
  note?: string;
  updatedAt?: unknown;
}

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_DURATION = 5;

const symptomOptions = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Breast tenderness",
  "Back pain",
  "Acne",
  "Nausea",
];

const moodOptions = [
  "😊 Good",
  "🙂 Normal",
  "😐 Okay",
  "😔 Low",
  "😣 Irritated",
];

const manualStatusOptions = [
  {
    value: "period",
    label: "Period",
    emoji: "🩸",
    color: "#d95376",
    background: "#fde1ea",
  },
  {
    value: "fertile",
    label: "Fertile",
    emoji: "🌷",
    color: "#7656aa",
    background: "#eee8ff",
  },
  {
    value: "ovulation",
    label: "Ovulation",
    emoji: "⭐",
    color: "#8c67c7",
    background: "#ddd1ff",
  },
  {
    value: "lower-fertility",
    label: "Lower Fertility",
    emoji: "🌿",
    color: "#36789a",
    background: "#e8f4fb",
  },
  {
    value: "expected",
    label: "Expected Period",
    emoji: "🩸",
    color: "#df9b59",
    background: "#fff0e0",
  },
] as const;

/* =========================================================
   DATE HELPERS
========================================================= */

const pad = (number: number) => String(number).padStart(2, "0");

const toDateString = (date: Date) => {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
};

const parseDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const addDays = (dateString: string, days: number) => {
  const date = parseDate(dateString);

  date.setDate(date.getDate() + days);

  return toDateString(date);
};

const differenceInDays = (start: string, end: string) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const formatReadableDate = (dateString?: string) => {
  if (!dateString) return "Not available";

  const date = parseDate(dateString);

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isDateBetween = (date: string, start: string, end: string) => {
  return date >= start && date <= end;
};

/* =========================================================
   COMPONENT
========================================================= */

const PeriodDashboard = () => {
  const navigate = useNavigate();

  /* =======================================================
     AUTH
  ======================================================= */

  const [userId, setUserId] = useState("");

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =======================================================
     DATA
  ======================================================= */

  const [cycles, setCycles] = useState<PeriodCycle[]>([]);
  const [, setProfile] = useState<PeriodProfile | null>(null);

  const [dailyLogs, setDailyLogs] = useState<DailyHealthLog[]>([]);

  const [dayOverrides, setDayOverrides] = useState<PeriodDayOverride[]>([]);

  /* =======================================================
     CALENDAR
  ======================================================= */

  const today = toDateString(new Date());

  const [selectedDate, setSelectedDate] = useState(today);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  });

  /* =======================================================
     PERIOD MODAL
  ======================================================= */

  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const [periodStartDate, setPeriodStartDate] = useState(today);

  const [periodEndDate, setPeriodEndDate] = useState("");

  const [periodFlow, setPeriodFlow] = useState("medium");

  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  const [periodToDelete, setPeriodToDelete] = useState<PeriodCycle | null>(
    null,
  );

  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState(false);

  /* =======================================================
     DAILY LOG MODAL
  ======================================================= */

  const [showLogModal, setShowLogModal] = useState(false);

  const [logDate, setLogDate] = useState(today);

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const [mood, setMood] = useState("🙂 Normal");

  const [painLevel, setPainLevel] = useState(0);

  const [notes, setNotes] = useState("");

  const [showDateActionModal, setShowDateActionModal] = useState(false);
  const [actionDate, setActionDate] = useState(today);

  const openDateActionMenu = (date: string) => {
    setSelectedDate(date);
    setActionDate(date);
    setShowDateActionModal(true);
  };

  /* =======================================================
     MANUAL DAY STATUS MODAL
  ======================================================= */

  const [showDayStatusModal, setShowDayStatusModal] = useState(false);

  const [dayStatusDate, setDayStatusDate] = useState(today);

  const [manualDayStatus, setManualDayStatus] = useState<DayStatus>("");

  const [manualDayNote, setManualDayNote] = useState("");

  /* =======================================================
     SETTINGS MODAL
  ======================================================= */

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [calculationMode, setCalculationMode] = useState<
    "automatic" | "manual"
  >("automatic");

  const [manualCycleLength, setManualCycleLength] =
    useState(DEFAULT_CYCLE_LENGTH);

  const [periodDuration, setPeriodDuration] = useState(DEFAULT_PERIOD_DURATION);

  const [reminderEnabled, setReminderEnabled] = useState(false);

  const [reminderDaysBefore, setReminderDaysBefore] = useState(2);

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setError("Please login to use Period & Wellness Calendar.");
        return;
      }

      setUserId(user.uid);
    });

    return () => unsubscribe();
  }, []);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      try {
        const profileRef = doc(db, "periodProfiles", userId);

        const snapshot = await getDoc(profileRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as PeriodProfile;

          setProfile(data);

          setCalculationMode(data.calculationMode || "automatic");

          setManualCycleLength(
            data.manualCycleLength ||
              data.averageCycleLength ||
              DEFAULT_CYCLE_LENGTH,
          );

          setPeriodDuration(data.periodDuration || DEFAULT_PERIOD_DURATION);

          setReminderEnabled(data.reminderEnabled || false);

          setReminderDaysBefore(data.reminderDaysBefore || 2);
        } else {
          const defaultProfile: PeriodProfile = {
            userId,
            averageCycleLength: DEFAULT_CYCLE_LENGTH,
            periodDuration: DEFAULT_PERIOD_DURATION,
            calculationMode: "automatic",
            manualCycleLength: DEFAULT_CYCLE_LENGTH,
            reminderEnabled: false,
            reminderDaysBefore: 2,
            updatedAt: Timestamp.now(),
          };

          setProfile(defaultProfile);
        }
      } catch (err) {
        console.error("Profile loading error:", err);

        setError("Failed to load period profile.");
      }
    };

    loadProfile();
  }, [userId]);

  /* =======================================================
     LOAD CYCLES
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const cyclesQuery = query(
      collection(db, "periodCycles"),
      where("userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      cyclesQuery,
      (snapshot) => {
        const list: PeriodCycle[] = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<PeriodCycle, "id">),
          }))
          .sort((a, b) => b.startDate.localeCompare(a.startDate));

        setCycles(list);
        setLoading(false);
      },
      (err) => {
        console.error("Cycle loading error:", err);

        setError("Failed to load period history.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);


  const deleteDailyLog = async () => {
  if (!userId || !logDate) return;

  const existingLog = dailyLogs.find((log) => log.date === logDate);

  if (!existingLog) {
    setShowLogModal(false);
    return;
  }

  try {
    setSaving(true);
    setError("");

    await deleteDoc(doc(db, "dailyHealthLogs", existingLog.id));

    setShowLogModal(false);
    setSuccess(`${formatReadableDate(logDate)} wellness log has been deleted.`);

    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    console.error("Delete daily log error:", err);
    setError("Failed to delete wellness log.");
  } finally {
    setSaving(false);
  }
};

  /* =======================================================
     LOAD DAILY LOGS
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    const logsQuery = query(
      collection(db, "dailyHealthLogs"),
      where("userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const list: DailyHealthLog[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<DailyHealthLog, "id">),
        }));

        setDailyLogs(list);
      },
      (err) => {
        console.error("Daily logs loading error:", err);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  /* =======================================================
     LOAD MANUAL DAY STATUS OVERRIDES
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    const overridesQuery = query(
      collection(db, "periodDayOverrides"),
      where("userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      overridesQuery,
      (snapshot) => {
        const list: PeriodDayOverride[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<PeriodDayOverride, "id">),
        }));

        setDayOverrides(list);
      },
      (err) => {
        console.error("Day override loading error:", err);

        setError("Failed to load manual calendar settings.");
      },
    );

    return () => unsubscribe();
  }, [userId]);

  /* =======================================================
     AUTOMATIC AVERAGE CYCLE
  ======================================================= */

  const automaticCycleLength = useMemo(() => {
    if (cycles.length < 2) {
      return DEFAULT_CYCLE_LENGTH;
    }

    const sortedCycles = [...cycles]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-6);

    const differences: number[] = [];

    for (let i = 1; i < sortedCycles.length; i++) {
      const difference = differenceInDays(
        sortedCycles[i - 1].startDate,
        sortedCycles[i].startDate,
      );

      if (difference >= 21 && difference <= 45) {
        differences.push(difference);
      }
    }

    if (!differences.length) {
      return DEFAULT_CYCLE_LENGTH;
    }

    const average =
      differences.reduce((sum, value) => sum + value, 0) / differences.length;

    return Math.round(average);
  }, [cycles]);

  /* =======================================================
     EFFECTIVE CYCLE LENGTH
  ======================================================= */

  const effectiveCycleLength =
    calculationMode === "manual" ? manualCycleLength : automaticCycleLength;

  /* =======================================================
     LATEST CYCLE
  ======================================================= */

  const latestCycle = cycles[0];

  /* =======================================================
     NEXT PERIOD
  ======================================================= */

  const nextPeriodDate = latestCycle
    ? addDays(latestCycle.startDate, effectiveCycleLength)
    : "";

  /* =======================================================
     OVULATION
  ======================================================= */

  const ovulationDate = latestCycle ? addDays(nextPeriodDate, -14) : "";

  /* =======================================================
     FERTILE WINDOW
  ======================================================= */

  const fertileStart = latestCycle ? addDays(ovulationDate, -5) : "";

  const fertileEnd = latestCycle ? addDays(ovulationDate, 1) : "";

  /* =======================================================
     LOWER FERTILITY WINDOWS
  ======================================================= */

  const lowerFertilityBeforeStart = latestCycle
    ? addDays(
        latestCycle.startDate,
        latestCycle.periodDuration || periodDuration,
      )
    : "";

  const lowerFertilityBeforeEnd = fertileStart ? addDays(fertileStart, -1) : "";

  const lowerFertilityAfterStart = fertileEnd ? addDays(fertileEnd, 1) : "";

  const lowerFertilityAfterEnd = nextPeriodDate
    ? addDays(nextPeriodDate, -1)
    : "";

  /* =======================================================
     CURRENT CYCLE DAY
  ======================================================= */

  const currentCycleDay = latestCycle
    ? Math.max(1, differenceInDays(latestCycle.startDate, today) + 1)
    : 0;

  /* =======================================================
     CURRENT PERIOD STATUS
  ======================================================= */

  const isCurrentPeriod =
    latestCycle &&
    differenceInDays(latestCycle.startDate, today) >= 0 &&
    differenceInDays(latestCycle.startDate, today) <
      (latestCycle.periodDuration || periodDuration);

  /* =======================================================
     AUTOMATIC DATE STATUS
  ======================================================= */

  const getAutomaticDateStatus = (date: string): DayStatus => {
    /* PERIOD */

    const periodCycle = cycles.find((cycle) => {
      const duration = cycle.periodDuration || periodDuration;

      const end = addDays(cycle.startDate, duration - 1);

      return isDateBetween(date, cycle.startDate, end);
    });

    if (periodCycle) {
      return "period";
    }

    /* OVULATION */

    if (ovulationDate && date === ovulationDate) {
      return "ovulation";
    }

    /* FERTILE */

    if (
      fertileStart &&
      fertileEnd &&
      isDateBetween(date, fertileStart, fertileEnd)
    ) {
      return "fertile";
    }

    /* EXPECTED PERIOD */

    if (nextPeriodDate && date === nextPeriodDate) {
      return "expected";
    }

    /* LOWER FERTILITY */

    if (latestCycle) {
      const beforeFertile =
        lowerFertilityBeforeStart &&
        lowerFertilityBeforeEnd &&
        isDateBetween(date, lowerFertilityBeforeStart, lowerFertilityBeforeEnd);

      const afterFertile =
        lowerFertilityAfterStart &&
        lowerFertilityAfterEnd &&
        isDateBetween(date, lowerFertilityAfterStart, lowerFertilityAfterEnd);

      if (beforeFertile || afterFertile) {
        return "lower-fertility";
      }
    }

    return "";
  };

  /* =======================================================
     MANUAL OVERRIDE LOOKUP
  ======================================================= */

  const getManualOverride = (date: string) => {
    return dayOverrides.find((item) => item.date === date);
  };

  /* =======================================================
     FINAL DATE STATUS
     
     MANUAL OVERRIDE ALWAYS WINS
  ======================================================= */

  const getDateStatus = (date: string): DayStatus => {
    const manualOverride = getManualOverride(date);

    if (manualOverride) {
      return manualOverride.status;
    }

    return getAutomaticDateStatus(date);
  };

  /* =======================================================
     CALENDAR DAYS
  ======================================================= */

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1);

    const lastDay = new Date(calendarMonth.year, calendarMonth.month + 1, 0);

    const firstWeekday = firstDay.getDay();

    const totalDays = lastDay.getDate();

    const cells: (string | null)[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      cells.push(
        toDateString(new Date(calendarMonth.year, calendarMonth.month, day)),
      );
    }

    return cells;
  }, [calendarMonth]);

  /* =======================================================
     PREVIOUS MONTH
  ======================================================= */

  const previousMonth = () => {
    setCalendarMonth((current) => {
      const date = new Date(current.year, current.month - 1, 1);

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  /* =======================================================
     NEXT MONTH
  ======================================================= */

  const nextMonth = () => {
    setCalendarMonth((current) => {
      const date = new Date(current.year, current.month + 1, 1);

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  /* =======================================================
     OPEN LOG MODAL
  ======================================================= */

  const openLogModal = (date = selectedDate) => {
    const existingLog = dailyLogs.find((log) => log.date === date);

    setLogDate(date);

    setSelectedSymptoms(existingLog?.symptoms || []);

    setMood(existingLog?.mood || "🙂 Normal");

    setPainLevel(existingLog?.painLevel || 0);

    setNotes(existingLog?.notes || "");

    setShowLogModal(true);
  };

  /* =======================================================
     OPEN DAY STATUS MODAL
  ======================================================= */

  const openDayStatusModal = (date: string) => {
    const existingOverride = getManualOverride(date);

    setDayStatusDate(date);

    setManualDayStatus(existingOverride?.status || "");

    setManualDayNote(existingOverride?.note || "");

    setShowDayStatusModal(true);
  };

  /* =======================================================
     SAVE MANUAL DAY STATUS
  ======================================================= */

  const saveManualDayStatus = async () => {
    if (!userId || !dayStatusDate) {
      return;
    }

    if (!manualDayStatus) {
      setError("Please select a day status.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const existingOverride = getManualOverride(dayStatusDate);

      const data = {
        userId,
        date: dayStatusDate,
        status: manualDayStatus,
        note: manualDayNote.trim(),
        updatedAt: Timestamp.now(),
      };

      if (existingOverride) {
        await setDoc(doc(db, "periodDayOverrides", existingOverride.id), data, {
          merge: true,
        });
      } else {
        await addDoc(collection(db, "periodDayOverrides"), data);
      }

      setShowDayStatusModal(false);

      setSuccess(
        `Manual status saved for ${formatReadableDate(dayStatusDate)}.`,
      );

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Manual day status save error:", err);

      setError("Failed to save manual day status.");
    } finally {
      setSaving(false);
    }
  };
  const clearManualDayStatusForDate = async (date: string) => {
    if (!userId || !date) return;

    const existingOverride = getManualOverride(date);

    if (!existingOverride) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await deleteDoc(doc(db, "periodDayOverrides", existingOverride.id));

      setShowDateActionModal(false);

      setSuccess(
        `Manual override cleared for ${formatReadableDate(
          date,
        )}. Automatic status restored.`,
      );

      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error("Clear manual status error:", err);

      setError("Failed to clear manual day status.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     CLEAR MANUAL DAY STATUS
  ======================================================= */

  const clearManualDayStatus = async () => {
    if (!userId || !dayStatusDate) {
      return;
    }

    const existingOverride = getManualOverride(dayStatusDate);

    if (!existingOverride) {
      setShowDayStatusModal(false);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await deleteDoc(doc(db, "periodDayOverrides", existingOverride.id));

      setManualDayStatus("");
      setManualDayNote("");

      setShowDayStatusModal(false);

      setSuccess(
        `Manual override cleared for ${formatReadableDate(
          dayStatusDate,
        )}. Automatic status restored.`,
      );

      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error("Clear manual status error:", err);

      setError("Failed to clear manual day status.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE DAILY LOG
  ======================================================= */

  const saveDailyLog = async () => {
    if (!userId || !logDate) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const existingLog = dailyLogs.find((log) => log.date === logDate);

      const data = {
        userId,
        date: logDate,
        symptoms: selectedSymptoms,
        mood,
        painLevel,
        notes,
        updatedAt: Timestamp.now(),
      };

      if (existingLog) {
        await setDoc(doc(db, "dailyHealthLogs", existingLog.id), data, {
          merge: true,
        });
      } else {
        await addDoc(collection(db, "dailyHealthLogs"), {
          ...data,
          createdAt: Timestamp.now(),
        });
      }

      setShowLogModal(false);

      setSuccess("Today's wellness log has been saved.");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Daily log save error:", err);

      setError("Failed to save today's wellness log.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     PERIOD FORM HELPERS
  ======================================================= */

  const resetPeriodForm = () => {
    setEditingPeriodId(null);
    setPeriodStartDate(today);
    setPeriodEndDate("");
    setPeriodFlow("medium");
  };

  const openAddPeriodModal = () => {
    resetPeriodForm();
    setShowPeriodModal(true);
  };

  const openEditPeriodModal = (cycle: PeriodCycle) => {
    setEditingPeriodId(cycle.id);
    setPeriodStartDate(cycle.startDate);
    setPeriodEndDate(cycle.endDate || "");
    setPeriodFlow(cycle.flow || "medium");
    setShowPeriodModal(true);
  };

  const openDeletePeriodModal = (cycle: PeriodCycle) => {
    setPeriodToDelete(cycle);
    setShowDeletePeriodModal(true);
  };

  /* =======================================================
     SAVE PERIOD
  ======================================================= */

  const savePeriod = async () => {
    if (!userId || !periodStartDate) {
      setError("Please select a period start date.");
      return;
    }

    if (periodEndDate && periodEndDate < periodStartDate) {
      setError("Period end date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let calculatedDuration = periodDuration;

      if (periodEndDate) {
        calculatedDuration = Math.max(
          1,
          differenceInDays(periodStartDate, periodEndDate) + 1,
        );
      }

      let calculatedCycleLength: number | undefined;

      const previousCycles = cycles
        .filter((cycle) => cycle.startDate < periodStartDate)
        .sort((a, b) => b.startDate.localeCompare(a.startDate));

      const previousCycle = previousCycles[0];

      if (previousCycle) {
        const difference = differenceInDays(
          previousCycle.startDate,
          periodStartDate,
        );

        if (difference >= 15 && difference <= 60) {
          calculatedCycleLength = difference;
        }
      }

      const periodData = {
        userId,
        startDate: periodStartDate,
        endDate: periodEndDate || "",
        periodDuration: calculatedDuration,
        cycleLength: calculatedCycleLength || effectiveCycleLength,
        flow: periodFlow,
      };

      if (editingPeriodId) {
        await updateDoc(doc(db, "periodCycles", editingPeriodId), {
          ...periodData,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, "periodCycles"), {
          ...periodData,
          symptoms: [],
          mood: "",
          painLevel: 0,
          notes: "",
          createdAt: Timestamp.now(),
        });
      }

      setShowPeriodModal(false);

      const wasEditing = !!editingPeriodId;

      setEditingPeriodId(null);

      setSuccess(
        wasEditing
          ? "Period information has been updated."
          : "Period information has been saved.",
      );

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Period save error:", err);

      setError("Failed to save period information.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE PERIOD
  ======================================================= */

  const deletePeriod = async () => {
    if (!periodToDelete) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await deleteDoc(doc(db, "periodCycles", periodToDelete.id));

      setShowDeletePeriodModal(false);
      setPeriodToDelete(null);

      setSuccess("Period record has been deleted.");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Period delete error:", err);

      setError("Failed to delete period record.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const saveSettings = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setError("");

      const data: PeriodProfile = {
        userId,
        averageCycleLength: automaticCycleLength,
        periodDuration,
        calculationMode,
        manualCycleLength,
        reminderEnabled,
        reminderDaysBefore,
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, "periodProfiles", userId), data, { merge: true });

      setProfile(data);

      setShowSettingsModal(false);

      setSuccess("Period settings have been updated.");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Settings save error:", err);

      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SYMPTOM TOGGLE
  ======================================================= */

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    );
  };

  /* =======================================================
     STATUS DISPLAY HELPER
  ======================================================= */

  const getStatusConfig = (status: DayStatus) => {
    return manualStatusOptions.find((item) => item.value === status);
  };

  /* =======================================================
     PAGE LOADING
  ======================================================= */

  if (loading && !userId) {
    return (
      <Container className="py-5 text-center">
        <Spinner />

        <p className="text-muted mt-3">Opening wellness calendar...</p>
      </Container>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Container
        fluid
        className="py-4"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #fff7fb 0%, #f6f1ff 48%, #eefbf5 100%)",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div
                className="d-flex align-items-center mb-2"
                style={{
                  color: "#b14f7a",
                }}
              >
                <FaHeart size={22} className="me-2" />

                <span
                  className="small fw-semibold"
                  style={{
                    letterSpacing: "1.5px",
                  }}
                >
                  WELLNESS & SELF CARE
                </span>
              </div>

              <div className="small text-muted">
                Auto Prediction + Manual Daily Control
              </div>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <Button
                className="px-3"
                style={{
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #c75c8a, #925bb4)",
                  border: "none",
                }}
                onClick={openAddPeriodModal}
              >
                <FaTint className="me-2" />
                Log Period
              </Button>

              <Button
                variant="outline-dark"
                className="rounded-pill px-4"
                onClick={() => navigate("/user/dashboard")}
              >
                <FaArrowLeft className="me-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "20px",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "52px",
                      height: "52px",
                      background: "#fde7ef",
                      color: "#c34e7c",
                    }}
                  >
                    <FaCalendarAlt />
                  </div>

                  <div>
                    <div className="text-muted small">Cycle Day</div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {currentCycleDay || "—"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "20px",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "52px",
                      height: "52px",
                      background: "#eee7ff",
                      color: "#7954b5",
                    }}
                  >
                    <FaClock />
                  </div>

                  <div>
                    <div className="text-muted small">Next Period</div>

                    <div
                      className="fw-bold"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {nextPeriodDate
                        ? formatReadableDate(nextPeriodDate)
                        : "Add period"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "20px",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "52px",
                      height: "52px",
                      background: "#eee9ff",
                      color: "#7656aa",
                    }}
                  >
                    <FaHeart />
                  </div>

                  <div>
                    <div className="text-muted small">Cycle Length</div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {effectiveCycleLength}

                      <span className="fs-6 fw-normal"> days</span>
                    </div>

                    <small className="text-muted">
                      {calculationMode === "manual" ? "Manual" : "Automatic"}
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "20px",
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "52px",
                      height: "52px",
                      background: "#e5f8ef",
                      color: "#299466",
                    }}
                  >
                    <FaTint />
                  </div>

                  <div>
                    <div className="text-muted small">Current Status</div>

                    <div className="mt-1">
                      {isCurrentPeriod ? (
                        <Badge
                          style={{
                            background: "#d95376",
                            borderRadius: "15px",
                          }}
                        >
                          Period
                        </Badge>
                      ) : (
                        <Badge
                          style={{
                            background: "#299466",
                            borderRadius: "15px",
                          }}
                        >
                          Tracking
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <Row className="g-4">
          {/* =============================================
              CALENDAR
          ============================================== */}

          <Col lg={8}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "24px",
                overflow: "hidden",
              }}
            >
              <Card.Body className="p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Button
                    variant="light"
                    onClick={previousMonth}
                    style={{
                      borderRadius: "10px",
                    }}
                  >
                    <FaChevronLeft />
                  </Button>

                  <div className="text-center">
                    <h4
                      className="fw-bold mb-0"
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#3d2b37",
                      }}
                    >
                      {new Date(
                        calendarMonth.year,
                        calendarMonth.month,
                        1,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>

                    <small className="text-muted">Your wellness calendar</small>
                  </div>

                  <Button
                    variant="light"
                    onClick={nextMonth}
                    style={{
                      borderRadius: "10px",
                    }}
                  >
                    <FaChevronRight />
                  </Button>
                </div>

                {/* WEEKDAYS */}

               <div
  className="d-grid mb-2"
  style={{
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: window.innerWidth < 576 ? "3px" : "5px",
  }}
>
  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
    (day) => (
      <div
        key={day}
        className="text-center fw-semibold text-muted py-1"
        style={{
          fontSize:
            window.innerWidth < 576
              ? "10px"
              : "12px",
        }}
      >
        {window.innerWidth < 576
          ? day.charAt(0)
          : day}
      </div>
    ),
  )}
</div>
                {/* CALENDAR */}

            


<div
  className="d-grid"
  style={{
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: window.innerWidth < 576 ? "3px" : "5px",
  }}
>
  {calendarDays.map((date, index) => {
    if (!date) {
      return (
        <div
          key={`empty-${index}`}
          style={{
            minHeight: window.innerWidth < 576 ? "48px" : "70px",
          }}
        />
      );
    }

    const status = getDateStatus(date);
    const automaticStatus = getAutomaticDateStatus(date);
    const manualOverride = getManualOverride(date);

    const selected = selectedDate === date;
    const isToday = date === today;

    const log = dailyLogs.find((item) => item.date === date);

    let background = "#fff";
    let border = "1px solid #eee";
    let textColor = "#4b3b45";

    /* STATUS COLORS */

    if (status === "period") {

      background = "#fde1ea";
      border = "1px solid #f1a6bd";
      textColor = "#a63e64";
    }

    if (status === "lower-fertility") {
      background = "#e8f4fb";
      border = "1px solid #9bcde5";
      textColor = "#36789a";
    }

    if (status === "fertile") {
      background = "#eee8ff";
      border = "1px solid #c9b8ef";
      textColor = "#7050a7";
    }

    if (status === "ovulation") {
      background = "#ddd1ff";
      border = "2px solid #8c67c7";
      textColor = "#5d3e8f";
    }

    if (status === "expected") {
      background = "#fff0e0";
      border = "1px dashed #e0a86d";
      textColor = "#a7652e";
    }

    return (
      <div
        key={date}
        style={{
          position: "relative",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => openDateActionMenu(date)}
          style={{
            width: "100%",
            minWidth: 0,

            /* Mobile */
            minHeight: window.innerWidth < 576 ? "48px" : "70px",

            border,
            borderRadius: window.innerWidth < 576 ? "8px" : "12px",

            background,
            color: textColor,

            position: "relative",

            padding:
              window.innerWidth < 576
                ? "5px 3px"
                : "8px",

            cursor: "pointer",

            outline: selected
              ? "3px solid #c45c89"
              : "none",

            outlineOffset: "-3px",

            overflow: "hidden",
          }}
        >
          {/* DATE NUMBER */}

          <div
            className="d-flex justify-content-center align-items-center"
            style={{
              position: "relative",
              minHeight:
                window.innerWidth < 576
                  ? "20px"
                  : "24px",
            }}
          >
            <span
              className="fw-semibold"
              style={{
                fontSize:
                  window.innerWidth < 576
                    ? "12px"
                    : "14px",
              }}
            >
              {parseDate(date).getDate()}
            </span>

            {/* TODAY / MANUAL INDICATORS */}

            <div
              className="d-flex align-items-center gap-1"
              style={{
                position: "absolute",
                right:
                  window.innerWidth < 576
                    ? "2px"
                    : "5px",
                top: "1px",
              }}
            >
              {manualOverride && (
                <span
                  title="Manual status"
                  style={{
                    width:
                      window.innerWidth < 576
                        ? "5px"
                        : "7px",
                    height:
                      window.innerWidth < 576
                        ? "5px"
                        : "7px",
                    borderRadius: "50%",
                    background: "#c75c8a",
                    display: "inline-block",
                  }}
                />
              )}

              {isToday && (
                <span
                  title="Today"
                  style={{
                    width:
                      window.innerWidth < 576
                        ? "5px"
                        : "7px",
                    height:
                      window.innerWidth < 576
                        ? "5px"
                        : "7px",
                    borderRadius: "50%",
                    background: "#c75c8a",
                    display: "inline-block",
                  }}
                />
              )}
            </div>
          </div>

          {/* DESKTOP STATUS TEXT */}

          <div
            className="d-none d-sm-block"
            style={{
              fontSize: "11px",
              marginTop: "5px",
              lineHeight: "1.2",
            }}
          >
            {status === "period" && "🩸 Period"}

            {status === "lower-fertility" &&
              "🌿 Lower Fertility"}

            {status === "fertile" && "🌷 Fertile"}

            {status === "ovulation" && "⭐ Ovulation"}

            {status === "expected" &&
              "🩸 Expected"}
          </div>

          {/* MOBILE STATUS DOT */}

          <div
            className="d-sm-none"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "3px",
              gap: "3px",
            }}
          >
            {status && (
              <span
                title={
                  getStatusConfig(status)?.label ||
                  ""
                }
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background:
                    getStatusConfig(status)?.color ||
                    "#999",
                  display: "inline-block",
                }}
              />
            )}

            {log && (
              <span
                title="Wellness log saved"
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#299466",
                  display: "inline-block",
                }}
              />
            )}
          </div>

          {/* DESKTOP WELLNESS LOG */}

          {log && (
            <span
              className="d-none d-sm-block"
              title="Wellness log saved"
              style={{
                position: "absolute",
                bottom: "6px",
                right: "7px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#299466",
                boxShadow:
                  "0 0 0 2px rgba(41, 148, 102, 0.12)",
              }}
            />
          )}

          {/* MOBILE MANUAL INDICATOR */}

          {manualOverride && (
            <span
              className="d-sm-none"
              title="Manual status"
              style={{
                position: "absolute",
                bottom: "3px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "#925bb4",
              }}
            />
          )}
        </button>

        {/* DESKTOP AUTO STATUS */}

        {manualOverride &&
          automaticStatus !== manualOverride.status && (
            <div
              className="d-none d-sm-block text-center"
              style={{
                fontSize: "8px",
                color: "#8a6d3b",
                marginTop: "2px",
              }}
            >
              Auto:{" "}
              {getStatusConfig(automaticStatus)?.label ||
                "None"}
            </div>
          )}
      </div>
    );
  })}
</div>



                {/* LEGEND */}

                <div className="d-flex flex-wrap gap-3 mt-4 small text-muted">
                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#d95376",
                      }}
                    />
                    Period
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#36789a",
                      }}
                    />
                    Lower Fertility
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#7656aa",
                      }}
                    />
                    Fertile
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#8c67c7",
                      }}
                    />
                    Ovulation
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#df9b59",
                      }}
                    />
                    Expected Period
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#299466",
                      }}
                    />
                    Wellness log
                  </span>

                  <span>
                    <span
                      className="me-1"
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#c75c8a",
                      }}
                    />
                    Manual
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* =============================================
              RIGHT SIDE
          ============================================== */}

          <Col lg={4}>
            <div className="d-flex flex-column gap-4">
              {/* CYCLE CARD */}

              <Card
                className="border-0 shadow-sm"
                style={{
                  borderRadius: "24px",
                  background: "linear-gradient(145deg, #fff, #fff4f8)",
                }}
              >
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">Cycle Overview</h5>

                    <FaHeart
                      style={{
                        color: "#c75c8a",
                      }}
                    />
                  </div>

                  {latestCycle ? (
                    <>
                      <div className="mb-3">
                        <small className="text-muted">Last Period</small>

                        <div className="fw-semibold">
                          {formatReadableDate(latestCycle.startDate)}
                        </div>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted">
                          Estimated Ovulation
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(ovulationDate)}
                        </div>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted">Fertile Window</small>

                        <div className="fw-semibold">
                          {formatReadableDate(fertileStart)} –{" "}
                          {formatReadableDate(fertileEnd)}
                        </div>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted">Lower Fertility</small>

                        <div className="small">
                          <div>
                            Before fertile:{" "}
                            {formatReadableDate(lowerFertilityBeforeStart)} –{" "}
                            {formatReadableDate(lowerFertilityBeforeEnd)}
                          </div>

                          <div className="mt-1">
                            After fertile:{" "}
                            {formatReadableDate(lowerFertilityAfterStart)} –{" "}
                            {formatReadableDate(lowerFertilityAfterEnd)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <small className="text-muted">
                          Next Expected Period
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(nextPeriodDate)}
                        </div>
                      </div>

                      <hr />

                      <div className="small text-muted">
                        Calculation:
                        <strong className="ms-1">
                          {calculationMode === "manual"
                            ? `Manual (${manualCycleLength} days)`
                            : `Automatic (${automaticCycleLength} days)`}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <FaTint
                        size={35}
                        style={{
                          color: "#c75c8a",
                        }}
                      />

                      <p className="text-muted mt-3 mb-3">
                        Add your first period to start cycle tracking.
                      </p>

                      <Button
                        size="sm"
                        onClick={openAddPeriodModal}
                        style={{
                          border: "none",
                          background: "#c75c8a",
                          borderRadius: "10px",
                        }}
                      >
                        <FaPlus className="me-1" />
                        Add Period
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* QUICK ACTIONS */}

              <Card
                className="border-0 shadow-sm"
                style={{
                  borderRadius: "24px",
                }}
              >
                <Card.Body className="p-4">
                  <h5 className="fw-bold mb-3">Quick Actions</h5>

                  <div className="d-grid gap-2">
                    <Button
                      variant="light"
                      className="text-start py-3"
                      onClick={() => setShowSettingsModal(true)}
                      style={{
                        borderRadius: "12px",
                        border: "1px solid #eee3e9",
                      }}
                    >
                      🔔 <strong>Cycle Settings</strong>
                      <div className="small text-muted ms-4">
                        Manage your reminders
                      </div>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>

        {/* =================================================
            PERIOD HISTORY
        ================================================= */}

        <Card
          className="border-0 shadow-sm mt-4"
          style={{
            borderRadius: "20px",
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">🩸 Period History</h5>

              <Badge bg="light" text="dark">
                {cycles.length} records
              </Badge>
            </div>

            {cycles.length === 0 ? (
              <p className="text-muted mb-0">No period records yet.</p>
            ) : (
              <div className="d-grid gap-3">
                {cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="p-3 rounded-3"
                    style={{
                      background: "#fff7fb",
                      border: "1px solid #f0dce7",
                    }}
                  >
                    <Row className="align-items-center g-3">
                      <Col md={7}>
                        <div className="fw-semibold">
                          {formatReadableDate(cycle.startDate)}

                          {cycle.endDate
                            ? ` – ${formatReadableDate(cycle.endDate)}`
                            : ""}
                        </div>

                        <div className="small text-muted mt-1">
                          Duration: {cycle.periodDuration || periodDuration}{" "}
                          days
                          {cycle.flow ? ` • Flow: ${cycle.flow}` : ""}
                        </div>
                      </Col>

                      <Col
                        md={5}
                        className="d-flex justify-content-md-end gap-2"
                      >
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openEditPeriodModal(cycle)}
                        >
                          ✏️ Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => openDeletePeriodModal(cycle)}
                        >
                          🗑️ Delete
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* =================================================
            SAFETY INFORMATION
        ================================================= */}

        <Card
          className="border-0 shadow-sm mt-4"
          style={{
            borderRadius: "20px",
            background: "rgba(255,255,255,0.85)",
          }}
        >
          <Card.Body className="p-4">
            <div className="d-flex align-items-start">
              <FaInfoCircle
                className="me-3 mt-1"
                style={{
                  color: "#7b61a8",
                }}
              />

              <div>
                <p className="text-muted small mb-0">
                  Period shown here are calendar-based estimates. They can vary
                  from cycle to cycle, especially when cycles are irregular.
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>

      {/* ===================================================
    DATE ACTION MENU
=================================================== */}

      <Modal
        show={showDateActionModal}
        onHide={() => !saving && setShowDateActionModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            📅 {formatReadableDate(actionDate)}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* CURRENT STATUS */}

          <div
            className="p-3 rounded-3 mb-3"
            style={{
              background: "#faf7fb",
              border: "1px solid #eee3e9",
            }}
          >
            <div className="small text-muted mb-1">Current Status</div>

            {getDateStatus(actionDate) ? (
              <div className="fw-semibold">
                {getStatusConfig(getDateStatus(actionDate))?.emoji}{" "}
                {getStatusConfig(getDateStatus(actionDate))?.label}
              </div>
            ) : (
              <div className="text-muted">No cycle status</div>
            )}

            {getManualOverride(actionDate) && (
              <Badge
                className="mt-2"
                style={{
                  background: "#925bb4",
                }}
              >
                Manual
              </Badge>
            )}
          </div>

          {/* ACTIONS */}

          <div className="d-grid gap-2">
            <Button
              variant="light"
              className="text-start p-3"
              onClick={() => {
                setShowDateActionModal(false);
                openLogModal(actionDate);
              }}
              style={{
                borderRadius: "14px",
                border: "1px solid #eee3e9",
              }}
            >
              <div className="fw-semibold">📝 Log Wellness</div>
            </Button>

            <Button
              variant="light"
              className="text-start p-3"
              onClick={() => {
                setShowDateActionModal(false);
                openDayStatusModal(actionDate);
              }}
              style={{
                borderRadius: "14px",
                border: "1px solid #eee3e9",
              }}
            >
              <div className="fw-semibold">✏️ Manual Status</div>
            </Button>

            {/* CLEAR MANUAL OVERRIDE */}

            {getManualOverride(actionDate) && (
              <Button
                variant="outline-danger"
                className="text-start p-3"
                disabled={saving}
                onClick={() => clearManualDayStatusForDate(actionDate)}
                style={{
                  borderRadius: "14px",
                }}
              >
                🗑️ Clear Manual Status
              </Button>
            )}
          </div>

          {/* NOTE */}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={() => setShowDateActionModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================
          PERIOD MODAL
      =================================================== */}

      <Modal
        show={showPeriodModal}
        onHide={() => !saving && setShowPeriodModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {editingPeriodId ? "✏️ Edit Period" : "🩸 Log Period"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Period Start Date</Form.Label>

            <Form.Control
              type="date"
              value={periodStartDate}
              onChange={(e) => setPeriodStartDate(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Period End Date <span className="text-muted">(optional)</span>
            </Form.Label>

            <Form.Control
              type="date"
              value={periodEndDate}
              min={periodStartDate}
              onChange={(e) => setPeriodEndDate(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Flow</Form.Label>

            <Form.Select
              value={periodFlow}
              onChange={(e) => setPeriodFlow(e.target.value)}
            >
              <option value="light">Light</option>

              <option value="medium">Medium</option>

              <option value="heavy">Heavy</option>
            </Form.Select>
          </Form.Group>

          <Alert variant="light" className="small">
            Your cycle length will be automatically calculated when enough
            previous period records are available. You can also choose Manual
            cycle length from Settings.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() => setShowPeriodModal(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={savePeriod}
            disabled={saving}
            style={{
              background: "#c75c8a",
              border: "none",
            }}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                {editingPeriodId ? "Update Period" : "Save Period"}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================
          DELETE PERIOD MODAL
      =================================================== */}

      <Modal
        show={showDeletePeriodModal}
        onHide={() => !saving && setShowDeletePeriodModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">🗑️ Delete Period Record</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="mb-2">
            Are you sure you want to delete this period record?
          </p>

          <Alert variant="warning" className="small mb-0">
            Deleting this record may change your cycle, ovulation,
            fertile-window and expected-period predictions.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() => setShowDeletePeriodModal(false)}
          >
            Cancel
          </Button>

          <Button variant="danger" disabled={saving} onClick={deletePeriod}>
            {saving ? (
              <Spinner size="sm" />
            ) : (
              <>
                <FaTrash className="me-2" />
                Delete Record
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================
          MANUAL DAY STATUS MODAL
      =================================================== */}

      <Modal
        show={showDayStatusModal}
        onHide={() => !saving && setShowDayStatusModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">✏️ Set Day Status</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="mb-4">
            <div className="small text-muted">Selected Date</div>

            <div
              className="fw-bold fs-5"
              style={{
                color: "#422d39",
              }}
            >
              {formatReadableDate(dayStatusDate)}
            </div>
          </div>

          <Alert variant="info" className="small">
            Manual status will override the automatic calculation for this date
            only.
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Select Status</Form.Label>

            <div className="d-grid gap-2">
              {manualStatusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="light"
                  className="text-start p-3"
                  onClick={() => setManualDayStatus(option.value as DayStatus)}
                  style={{
                    border:
                      manualDayStatus === option.value
                        ? `2px solid ${option.color}`
                        : "1px solid #e5e5e5",
                    background:
                      manualDayStatus === option.value
                        ? option.background
                        : "#fff",
                    borderRadius: "12px",
                    color: option.color,
                  }}
                >
                  <span className="me-2">{option.emoji}</span>

                  <strong>{option.label}</strong>

                  {manualDayStatus === option.value && (
                    <span className="float-end">✓</span>
                  )}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Note <span className="text-muted">(optional)</span>
            </Form.Label>

            <Form.Control
              as="textarea"
              rows={3}
              value={manualDayNote}
              onChange={(e) => setManualDayNote(e.target.value)}
              placeholder="Why did you manually change this day's status?"
            />
          </Form.Group>

          {getManualOverride(dayStatusDate) && (
            <Alert variant="warning" className="small mb-0">
              This date already has a manual override. Clearing it will restore
              the automatic status.
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() => setShowDayStatusModal(false)}
          >
            Cancel
          </Button>

          {getManualOverride(dayStatusDate) && (
            <Button
              variant="outline-danger"
              disabled={saving}
              onClick={clearManualDayStatus}
            >
              {saving ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <FaTrash className="me-2" />
                  Clear Override
                </>
              )}
            </Button>
          )}

          <Button
            onClick={saveManualDayStatus}
            disabled={saving || !manualDayStatus}
            style={{
              background: "#925bb4",
              border: "none",
            }}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Day Status
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================
          DAILY LOG MODAL
      =================================================== */}

      <Modal
        show={showLogModal}
        onHide={() => !saving && setShowLogModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">📝 Wellness Log</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-4">
            <Form.Label>Date</Form.Label>

            <Form.Control
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Symptoms</Form.Label>

            <div className="d-flex flex-wrap gap-2">
              {symptomOptions.map((symptom) => (
                <Button
                  key={symptom}
                  size="sm"
                  variant={
                    selectedSymptoms.includes(symptom) ? "primary" : "light"
                  }
                  onClick={() => toggleSymptom(symptom)}
                  style={{
                    borderRadius: "20px",
                  }}
                >
                  {symptom}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Mood</Form.Label>

            <div className="d-flex flex-wrap gap-2">
              {moodOptions.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={mood === item ? "dark" : "light"}
                  onClick={() => setMood(item)}
                  style={{
                    borderRadius: "20px",
                  }}
                >
                  {item}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Pain Level: <strong>{painLevel}/10</strong>
            </Form.Label>

            <Form.Range
              min={0}
              max={10}
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label className="fw-semibold">Notes</Form.Label>

            <Form.Control
              as="textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today?"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          {dailyLogs.some((log) => log.date === logDate) && (
  <Button
    variant="outline-danger"
    disabled={saving}
    onClick={deleteDailyLog}
  >
    Delete Log
  </Button>
)}
          <Button
            variant="light"
            disabled={saving}
            onClick={() => setShowLogModal(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={saveDailyLog}
            disabled={saving}
            style={{
              background: "#9b5db6",
              border: "none",
            }}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Wellness Log
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================
          SETTINGS MODAL
      =================================================== */}

      <Modal
        show={showSettingsModal}
        onHide={() => !saving && setShowSettingsModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">⚙️ Cycle Settings</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Calculation Mode</Form.Label>

            <div className="d-flex gap-2">
              <Button
                className="flex-fill"
                variant={calculationMode === "automatic" ? "primary" : "light"}
                onClick={() => setCalculationMode("automatic")}
              >
                Automatic
              </Button>

              <Button
                className="flex-fill"
                variant={calculationMode === "manual" ? "primary" : "light"}
                onClick={() => setCalculationMode("manual")}
              >
                Manual
              </Button>
            </div>
          </Form.Group>

          {calculationMode === "automatic" && (
            <Alert variant="info" className="small">
              Current automatic average:
              <strong> {automaticCycleLength} days</strong>
              <div className="mt-1">Based on your previous period records.</div>
            </Alert>
          )}

          {calculationMode === "manual" && (
            <Form.Group className="mb-3">
              <Form.Label>Cycle Length</Form.Label>

              <Form.Control
                type="number"
                min={15}
                max={60}
                value={manualCycleLength}
                onChange={(e) =>
                  setManualCycleLength(
                    Math.min(60, Math.max(15, Number(e.target.value))),
                  )
                }
              />

              <Form.Text>Usually entered between 15 and 60 days.</Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-4">
            <Form.Label>Period Duration</Form.Label>

            <Form.Control
              type="number"
              min={1}
              max={15}
              value={periodDuration}
              onChange={(e) =>
                setPeriodDuration(
                  Math.min(15, Math.max(1, Number(e.target.value))),
                )
              }
            />

            <Form.Text>Number of days your period usually lasts.</Form.Text>
          </Form.Group>

          <hr />

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <div className="fw-semibold">
                <FaBell className="me-2" />
                Period Reminder
              </div>

              <small className="text-muted">
                Save reminder preference for future notification integration.
              </small>
            </div>

            <Form.Check
              type="switch"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
            />
          </div>

          {reminderEnabled && (
            <Form.Group>
              <Form.Label>
                Remind me <strong>{reminderDaysBefore}</strong> days before
              </Form.Label>

              <Form.Select
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
              >
                <option value={1}>1 day before</option>

                <option value={2}>2 days before</option>

                <option value={3}>3 days before</option>

                <option value={5}>5 days before</option>

                <option value={7}>7 days before</option>
              </Form.Select>
            </Form.Group>
          )}

          <Alert variant="light" className="small mt-4 mb-0">
            <strong>Manual Day Status:</strong> You can independently set any
            calendar date as Period, Fertile, Ovulation, Lower Fertility or
            Expected Period. This does not change your cycle-length calculation.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() => setShowSettingsModal(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={saveSettings}
            disabled={saving}
            style={{
              background: "#925bb4",
              border: "none",
            }}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Settings
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PeriodDashboard;
