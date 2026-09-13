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

  FaBell,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaClock,
  FaHeart,
  FaInfoCircle,
  FaNotesMedical,
  FaPlus,
  FaSave,
  FaTint,
} from "react-icons/fa";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
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

/* =========================================================
   DATE HELPERS
========================================================= */

const pad = (number: number) =>
  String(number).padStart(2, "0");

const toDateString = (date: Date) => {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
};

const parseDate = (dateString: string) => {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
};

const addDays = (
  dateString: string,
  days: number
) => {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);

  return toDateString(date);
};

const differenceInDays = (
  start: string,
  end: string
) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  return Math.round(
    (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );
};

const formatReadableDate = (
  dateString?: string
) => {
  if (!dateString) return "Not available";

  const date = parseDate(dateString);

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isDateBetween = (
  date: string,
  start: string,
  end: string
) => {
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

  const [cycles, setCycles] = useState<
    PeriodCycle[]
  >([]);

  const [profile, setProfile] =
    useState<PeriodProfile | null>(null);

  const [dailyLogs, setDailyLogs] = useState<
    DailyHealthLog[]
  >([]);

  /* =======================================================
     CALENDAR
  ======================================================= */

  const today = toDateString(new Date());

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const date = new Date();

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });

  /* =======================================================
     PERIOD MODAL
  ======================================================= */

  const [showPeriodModal, setShowPeriodModal] =
    useState(false);

  const [periodStartDate, setPeriodStartDate] =
    useState(today);

  const [periodEndDate, setPeriodEndDate] =
    useState("");

  const [periodFlow, setPeriodFlow] =
    useState("medium");

  /* =======================================================
     DAILY LOG MODAL
  ======================================================= */

  const [showLogModal, setShowLogModal] =
    useState(false);

  const [logDate, setLogDate] =
    useState(today);

  const [selectedSymptoms, setSelectedSymptoms] =
    useState<string[]>([]);

  const [mood, setMood] = useState("🙂 Normal");

  const [painLevel, setPainLevel] =
    useState(0);

  const [notes, setNotes] = useState("");

  /* =======================================================
     SETTINGS MODAL
  ======================================================= */

  const [showSettingsModal, setShowSettingsModal] =
    useState(false);

  const [calculationMode, setCalculationMode] =
    useState<"automatic" | "manual">(
      "automatic"
    );

  const [manualCycleLength, setManualCycleLength] =
    useState(DEFAULT_CYCLE_LENGTH);

  const [periodDuration, setPeriodDuration] =
    useState(DEFAULT_PERIOD_DURATION);

  const [reminderEnabled, setReminderEnabled] =
    useState(false);

  const [reminderDaysBefore, setReminderDaysBefore] =
    useState(2);

  /* =======================================================
     AUTH + INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setLoading(false);
          setError(
            "Please login to use Period & Wellness Calendar."
          );
          return;
        }

        setUserId(user.uid);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      try {
        const profileRef = doc(
          db,
          "periodProfiles",
          userId
        );

        const snapshot =
          await getDoc(profileRef);

        if (snapshot.exists()) {
          const data =
            snapshot.data() as PeriodProfile;

          setProfile(data);

          setCalculationMode(
            data.calculationMode ||
              "automatic"
          );

          setManualCycleLength(
            data.manualCycleLength ||
              data.averageCycleLength ||
              DEFAULT_CYCLE_LENGTH
          );

          setPeriodDuration(
            data.periodDuration ||
              DEFAULT_PERIOD_DURATION
          );

          setReminderEnabled(
            data.reminderEnabled || false
          );

          setReminderDaysBefore(
            data.reminderDaysBefore || 2
          );
        } else {
          const defaultProfile: PeriodProfile = {
            userId,
            averageCycleLength:
              DEFAULT_CYCLE_LENGTH,
            periodDuration:
              DEFAULT_PERIOD_DURATION,
            calculationMode: "automatic",
            manualCycleLength:
              DEFAULT_CYCLE_LENGTH,
            reminderEnabled: false,
            reminderDaysBefore: 2,
            updatedAt: Timestamp.now(),
          };

          setProfile(defaultProfile);
        }
      } catch (err) {
        console.error(
          "Profile loading error:",
          err
        );

        setError(
          "Failed to load period profile."
        );
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
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      cyclesQuery,
      (snapshot) => {
        const list: PeriodCycle[] =
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<
                PeriodCycle,
                "id"
              >),
            }))
            .sort((a, b) =>
              b.startDate.localeCompare(
                a.startDate
              )
            );

        setCycles(list);
        setLoading(false);
      },
      (err) => {
        console.error(
          "Cycle loading error:",
          err
        );

        setError(
          "Failed to load period history."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  /* =======================================================
     LOAD DAILY LOGS
  ======================================================= */

  useEffect(() => {
    if (!userId) return;

    const logsQuery = query(
      collection(db, "dailyHealthLogs"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const list: DailyHealthLog[] =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<
              DailyHealthLog,
              "id"
            >),
          }));

        setDailyLogs(list);
      },
      (err) => {
        console.error(
          "Daily logs loading error:",
          err
        );
      }
    );

    return () => unsubscribe();
  }, [userId]);

  /* =======================================================
     AUTOMATIC AVERAGE CYCLE
  ======================================================= */

  const automaticCycleLength =
    useMemo(() => {
      if (cycles.length < 2) {
        return DEFAULT_CYCLE_LENGTH;
      }

      const sortedCycles = [...cycles]
        .sort((a, b) =>
          a.startDate.localeCompare(
            b.startDate
          )
        )
        .slice(-6);

      const differences: number[] = [];

      for (
        let i = 1;
        i < sortedCycles.length;
        i++
      ) {
        const difference =
          differenceInDays(
            sortedCycles[i - 1].startDate,
            sortedCycles[i].startDate
          );

        if (
          difference >= 21 &&
          difference <= 45
        ) {
          differences.push(difference);
        }
      }

      if (!differences.length) {
        return DEFAULT_CYCLE_LENGTH;
      }

      const average =
        differences.reduce(
          (sum, value) => sum + value,
          0
        ) / differences.length;

      return Math.round(average);
    }, [cycles]);

  /* =======================================================
     EFFECTIVE CYCLE LENGTH
  ======================================================= */

  const effectiveCycleLength =
    calculationMode === "manual"
      ? manualCycleLength
      : automaticCycleLength;

  /* =======================================================
     LATEST CYCLE
  ======================================================= */

  const latestCycle = cycles[0];

  /* =======================================================
     NEXT PERIOD
  ======================================================= */

  const nextPeriodDate = latestCycle
    ? addDays(
        latestCycle.startDate,
        effectiveCycleLength
      )
    : "";

  /* =======================================================
     OVULATION / FERTILE WINDOW
  ======================================================= */

  const ovulationDate = latestCycle
    ? addDays(
        nextPeriodDate,
        -14
      )
    : "";

  const fertileStart = latestCycle
    ? addDays(ovulationDate, -5)
    : "";

  const fertileEnd = latestCycle
    ? addDays(ovulationDate, 1)
    : "";

  /* =======================================================
     CURRENT CYCLE DAY
  ======================================================= */

  const currentCycleDay = latestCycle
    ? Math.max(
        1,
        differenceInDays(
          latestCycle.startDate,
          today
        ) + 1
      )
    : 0;

  /* =======================================================
     CURRENT PERIOD STATUS
  ======================================================= */

  const isCurrentPeriod =
    latestCycle &&
    differenceInDays(
      latestCycle.startDate,
      today
    ) >= 0 &&
    differenceInDays(
      latestCycle.startDate,
      today
    ) <
      (latestCycle.periodDuration ||
        periodDuration);

  /* =======================================================
     CALENDAR DAYS
  ======================================================= */

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      calendarMonth.year,
      calendarMonth.month,
      1
    );

    const lastDay = new Date(
      calendarMonth.year,
      calendarMonth.month + 1,
      0
    );

    const firstWeekday =
      firstDay.getDay();

    const totalDays =
      lastDay.getDate();

    const cells: (
      | string
      | null
    )[] = [];

    for (
      let i = 0;
      i < firstWeekday;
      i++
    ) {
      cells.push(null);
    }

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {
      cells.push(
        toDateString(
          new Date(
            calendarMonth.year,
            calendarMonth.month,
            day
          )
        )
      );
    }

    return cells;
  }, [calendarMonth]);

  /* =======================================================
     CALENDAR DATE STATUS
  ======================================================= */

  const getDateStatus = (
    date: string
  ) => {
    const periodCycle = cycles.find(
      (cycle) => {
        const duration =
          cycle.periodDuration ||
          periodDuration;

        const end = addDays(
          cycle.startDate,
          duration - 1
        );

        return isDateBetween(
          date,
          cycle.startDate,
          end
        );
      }
    );

    if (periodCycle) {
      return "period";
    }

    if (
      fertileStart &&
      fertileEnd &&
      isDateBetween(
        date,
        fertileStart,
        fertileEnd
      )
    ) {
      if (date === ovulationDate) {
        return "ovulation";
      }

      return "fertile";
    }

    if (
      nextPeriodDate &&
      date === nextPeriodDate
    ) {
      return "expected";
    }

    return "";
  };

  /* =======================================================
     PREVIOUS MONTH
  ======================================================= */

  const previousMonth = () => {
    setCalendarMonth((current) => {
      const date = new Date(
        current.year,
        current.month - 1,
        1
      );

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
      const date = new Date(
        current.year,
        current.month + 1,
        1
      );

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  /* =======================================================
     OPEN LOG MODAL
  ======================================================= */

  const openLogModal = (
    date = selectedDate
  ) => {
    const existingLog =
      dailyLogs.find(
        (log) => log.date === date
      );

    setLogDate(date);

    setSelectedSymptoms(
      existingLog?.symptoms || []
    );

    setMood(
      existingLog?.mood || "🙂 Normal"
    );

    setPainLevel(
      existingLog?.painLevel || 0
    );

    setNotes(
      existingLog?.notes || ""
    );

    setShowLogModal(true);
  };

  /* =======================================================
     SAVE DAILY LOG
  ======================================================= */

  const saveDailyLog = async () => {
    if (!userId || !logDate) return;

    try {
      setSaving(true);
      setError("");

      const existingLog =
        dailyLogs.find(
          (log) => log.date === logDate
        );

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
        await setDoc(
          doc(
            db,
            "dailyHealthLogs",
            existingLog.id
          ),
          
          data,
          { merge: true }
        );
      } else {
        await addDoc(
          collection(
            db,
            "dailyHealthLogs"
          ),
          {
            ...data,
            createdAt: Timestamp.now(),
          }
        );
      }

      setShowLogModal(false);

      setSuccess(
        "Today's wellness log has been saved."
      );

      setTimeout(
        () => setSuccess(""),
        3000
      );
    } catch (err) {
      console.error(
        "Daily log save error:",
        err
      );

      setError(
        "Failed to save today's wellness log."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SAVE PERIOD
  ======================================================= */

  const savePeriod = async () => {
    if (!userId || !periodStartDate) {
      setError(
        "Please select a period start date."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      let calculatedDuration =
        periodDuration;

      if (periodEndDate) {
        calculatedDuration =
          Math.max(
            1,
            differenceInDays(
              periodStartDate,
              periodEndDate
            ) + 1
          );
      }

      let calculatedCycleLength:
        | number
        | undefined;

      const previousCycle =
        cycles.find(
          (cycle) =>
            cycle.startDate <
            periodStartDate
        );

      if (previousCycle) {
        const difference =
          differenceInDays(
            previousCycle.startDate,
            periodStartDate
          );

        if (
          difference >= 15 &&
          difference <= 60
        ) {
          calculatedCycleLength =
            difference;
        }
      }

      await addDoc(
        collection(db, "periodCycles"),
        {
          userId,
          startDate: periodStartDate,
          endDate:
            periodEndDate || "",
          periodDuration:
            calculatedDuration,
          cycleLength:
            calculatedCycleLength ||
            effectiveCycleLength,
          flow: periodFlow,
          symptoms: [],
          mood: "",
          painLevel: 0,
          notes: "",
          createdAt: Timestamp.now(),
        }
      );

      setShowPeriodModal(false);

      setSuccess(
        "Period information has been saved."
      );

      setTimeout(
        () => setSuccess(""),
        3000
      );
    } catch (err) {
      console.error(
        "Period save error:",
        err
      );

      setError(
        "Failed to save period information."
      );
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
        averageCycleLength:
          automaticCycleLength,
        periodDuration,
        calculationMode,
        manualCycleLength,
        reminderEnabled,
        reminderDaysBefore,
        updatedAt: Timestamp.now(),
      };

      await setDoc(
        doc(
          db,
          "periodProfiles",
          userId
        ),
        data,
        { merge: true }
      );

      setProfile(data);

      setShowSettingsModal(false);

      setSuccess(
        "Period settings have been updated."
      );

      setTimeout(
        () => setSuccess(""),
        3000
      );
    } catch (err) {
      console.error(
        "Settings save error:",
        err
      );

      setError(
        "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     SYMPTOM TOGGLE
  ======================================================= */

  const toggleSymptom = (
    symptom: string
  ) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter(
            (item) => item !== symptom
          )
        : [...current, symptom]
    );
  };

  /* =======================================================
     PAGE LOADING
  ======================================================= */

  if (loading && !userId) {
    return (
      <Container className="py-5 text-center">
        <Spinner />
        <p className="text-muted mt-3">
          Opening wellness calendar...
        </p>
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
                <FaHeart
                  size={22}
                  className="me-2"
                />

                <span
                  className="small fw-semibold"
                  style={{
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  WELLNESS & SELF CARE
                </span>
              </div>

              <h2
                className="fw-bold mb-1"
                style={{
                  fontFamily:
                    "Georgia, serif",
                  color: "#392735",
                }}
              >
                Period & Wellness
              </h2>

              <p className="text-muted mb-0">
                Track your cycle, understand
                your body and keep your wellness
                notes in one place.
              </p>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="light"
                className="px-3"
                style={{
                  borderRadius: "12px",
                  border:
                    "1px solid #eadde5",
                }}
                onClick={() =>
                  setShowSettingsModal(true)
                }
              >
                ⚙️ Settings
              </Button>

              <Button
                className="px-3"
                style={{
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #c75c8a, #925bb4)",
                  border: "none",
                }}
                onClick={() =>
                  setShowPeriodModal(true)
                }
              >
                <FaTint className="me-2" />
                Log Period
              </Button>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() =>
              setError("")
            }
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            dismissible
            onClose={() =>
              setSuccess("")
            }
          >
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
                background:
                  "rgba(255,255,255,0.9)",
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
                    <div className="text-muted small">
                      Cycle Day
                    </div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {currentCycleDay ||
                        "—"}
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
                background:
                  "rgba(255,255,255,0.9)",
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
                    <div className="text-muted small">
                      Next Period
                    </div>

                    <div
                      className="fw-bold"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {nextPeriodDate
                        ? formatReadableDate(
                            nextPeriodDate
                          )
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
                background:
                  "rgba(255,255,255,0.9)",
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
                    <div className="text-muted small">
                      Cycle Length
                    </div>

                    <div
                      className="fw-bold fs-4"
                      style={{
                        color: "#422d39",
                      }}
                    >
                      {effectiveCycleLength}
                      <span className="fs-6 fw-normal">
                        {" "}
                        days
                      </span>
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
                background:
                  "rgba(255,255,255,0.9)",
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
                    <div className="text-muted small">
                      Current Status
                    </div>

                    <div className="mt-1">
                      {isCurrentPeriod ? (
                        <Badge
                          style={{
                            background:
                              "#d95376",
                            borderRadius:
                              "15px",
                          }}
                        >
                          Period
                        </Badge>
                      ) : (
                        <Badge
                          style={{
                            background:
                              "#5c9c78",
                            borderRadius:
                              "15px",
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
                        fontFamily:
                          "Georgia, serif",
                        color: "#3d2b37",
                      }}
                    >
                      {new Date(
                        calendarMonth.year,
                        calendarMonth.month,
                        1
                      ).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </h4>

                    <small className="text-muted">
                      Your wellness calendar
                    </small>
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
                    gridTemplateColumns:
                      "repeat(7, 1fr)",
                    gap: "5px",
                  }}
                >
                  {[
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ].map((day) => (
                    <div
                      key={day}
                      className="text-center small fw-semibold text-muted py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* CALENDAR */}

                <div
                  className="d-grid"
                  style={{
                    gridTemplateColumns:
                      "repeat(7, 1fr)",
                    gap: "5px",
                  }}
                >
                  {calendarDays.map(
                    (date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${index}`}
                            style={{
                              minHeight:
                                "70px",
                            }}
                          />
                        );
                      }

                      const status =
                        getDateStatus(
                          date
                        );

                      const selected =
                        selectedDate ===
                        date;

                      const isToday =
                        date === today;

                      const log =
                        dailyLogs.find(
                          (item) =>
                            item.date ===
                            date
                        );

                      let background =
                        "#fff";

                      let border =
                        "1px solid #eee";

                      let textColor =
                        "#4b3b45";

                      if (
                        status ===
                        "period"
                      ) {
                        background =
                          "#fde1ea";
                        border =
                          "1px solid #f1a6bd";
                        textColor =
                          "#a63e64";
                      }

                      if (
                        status ===
                        "fertile"
                      ) {
                        background =
                          "#eee8ff";
                        border =
                          "1px solid #c9b8ef";
                        textColor =
                          "#7050a7";
                      }

                      if (
                        status ===
                        "ovulation"
                      ) {
                        background =
                          "#ddd1ff";
                        border =
                          "2px solid #8c67c7";
                        textColor =
                          "#5d3e8f";
                      }

                      if (
                        status ===
                        "expected"
                      ) {
                        background =
                          "#fff0e0";
                        border =
                          "1px dashed #e0a86d";
                        textColor =
                          "#a7652e";
                      }

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(
                              date
                            );
                            openLogModal(
                              date
                            );
                          }}
                          style={{
                            minHeight:
                              "70px",
                            border,
                            borderRadius:
                              "12px",
                            background,
                            color:
                              textColor,
                            position:
                              "relative",
                            padding:
                              "8px",
                            cursor:
                              "pointer",
                            outline:
                              selected
                                ? "3px solid #c45c89"
                                : "none",
                            outlineOffset:
                              "-3px",
                          }}
                        >
                          <div className="d-flex justify-content-between">
                            <span
                              className="fw-semibold"
                            >
                              {parseDate(
                                date
                              ).getDate()}
                            </span>

                            {isToday && (
                              <span
                                style={{
                                  width:
                                    "7px",
                                  height:
                                    "7px",
                                  borderRadius:
                                    "50%",
                                  background:
                                    "#c75c8a",
                                  display:
                                    "inline-block",
                                }}
                              />
                            )}
                          </div>

                          {status ===
                            "period" && (
                            <div className="small mt-2">
                              🩸 Period
                            </div>
                          )}

                          {status ===
                            "fertile" && (
                            <div className="small mt-2">
                              🌷 Fertile
                            </div>
                          )}

                          {status ===
                            "ovulation" && (
                            <div className="small mt-2">
                              ⭐ Ovulation
                            </div>
                          )}

                          {status ===
                            "expected" && (
                            <div className="small mt-2">
                              🩸 Expected
                            </div>
                          )}

                          {log && (
                            <span
                              style={{
                                position:
                                  "absolute",
                                bottom:
                                  "6px",
                                right:
                                  "7px",
                                width:
                                  "7px",
                                height:
                                  "7px",
                                borderRadius:
                                  "50%",
                                background:
                                  "#55a879",
                              }}
                            />
                          )}
                        </button>
                      );
                    }
                  )}
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
                    Expected
                  </span>

                  <span>
                    <FaCircle
                      className="me-1"
                      style={{
                        color: "#55a879",
                      }}
                    />
                    Wellness log
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
                  background:
                    "linear-gradient(145deg, #fff, #fff4f8)",
                }}
              >
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">
                      Cycle Overview
                    </h5>

                    <FaHeart
                      style={{
                        color: "#c75c8a",
                      }}
                    />
                  </div>

                  {latestCycle ? (
                    <>
                      <div className="mb-3">
                        <small className="text-muted">
                          Last Period
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(
                            latestCycle.startDate
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted">
                          Estimated Ovulation
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(
                            ovulationDate
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <small className="text-muted">
                          Fertile Window
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(
                            fertileStart
                          )}{" "}
                          –{" "}
                          {formatReadableDate(
                            fertileEnd
                          )}
                        </div>
                      </div>

                      <div>
                        <small className="text-muted">
                          Next Expected Period
                        </small>

                        <div className="fw-semibold">
                          {formatReadableDate(
                            nextPeriodDate
                          )}
                        </div>
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
                        Add your first period
                        to start cycle
                        tracking.
                      </p>

                      <Button
                        size="sm"
                        onClick={() =>
                          setShowPeriodModal(
                            true
                          )
                        }
                        style={{
                          border: "none",
                          background:
                            "#c75c8a",
                          borderRadius:
                            "10px",
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
                  <h5 className="fw-bold mb-3">
                    Quick Actions
                  </h5>

                  <div className="d-grid gap-2">
                    <Button
                      variant="light"
                      className="text-start py-3"
                      onClick={() =>
                        openLogModal()
                      }
                      style={{
                        borderRadius:
                          "12px",
                        border:
                          "1px solid #eee3e9",
                      }}
                    >
                      📝{" "}
                      <strong>
                        Log Today's Wellness
                      </strong>
                      <div className="small text-muted ms-4">
                        Symptoms, mood,
                        pain & notes
                      </div>
                    </Button>

                    <Button
                      variant="light"
                      className="text-start py-3"
                      onClick={() =>
                        setShowPeriodModal(
                          true
                        )
                      }
                      style={{
                        borderRadius:
                          "12px",
                        border:
                          "1px solid #eee3e9",
                      }}
                    >
                      🩸{" "}
                      <strong>
                        Log Period
                      </strong>
                      <div className="small text-muted ms-4">
                        Start or complete
                        a period
                      </div>
                    </Button>

                    <Button
                      variant="light"
                      className="text-start py-3"
                      onClick={() =>
                        setShowSettingsModal(
                          true
                        )
                      }
                      style={{
                        borderRadius:
                          "12px",
                        border:
                          "1px solid #eee3e9",
                      }}
                    >
                      🔔{" "}
                      <strong>
                        Reminder Settings
                      </strong>
                      <div className="small text-muted ms-4">
                        Manage your
                        reminders
                      </div>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>

        {/* =================================================
            SAFETY INFORMATION
        ================================================= */}

        <Card
          className="border-0 shadow-sm mt-4"
          style={{
            borderRadius: "20px",
            background:
              "rgba(255,255,255,0.85)",
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
                <h6 className="fw-bold mb-1">
                  About cycle estimates
                </h6>

                <p className="text-muted small mb-0">
                  Fertile window, ovulation,
                  expected period and lower
                  fertility days shown here are
                  calendar-based estimates. They
                  can vary from cycle to cycle,
                  especially when cycles are
                  irregular. These estimates should
                  not be used as a guaranteed
                  method of pregnancy prevention.
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>

      {/* ===================================================
          PERIOD MODAL
      =================================================== */}

      <Modal
        show={showPeriodModal}
        onHide={() =>
          !saving &&
          setShowPeriodModal(false)
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            🩸 Log Period
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>
              Period Start Date
            </Form.Label>

            <Form.Control
              type="date"
              value={periodStartDate}
              onChange={(e) =>
                setPeriodStartDate(
                  e.target.value
                )
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Period End Date{" "}
              <span className="text-muted">
                (optional)
              </span>
            </Form.Label>

            <Form.Control
              type="date"
              value={periodEndDate}
              min={periodStartDate}
              onChange={(e) =>
                setPeriodEndDate(
                  e.target.value
                )
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Flow
            </Form.Label>

            <Form.Select
              value={periodFlow}
              onChange={(e) =>
                setPeriodFlow(
                  e.target.value
                )
              }
            >
              <option value="light">
                Light
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="heavy">
                Heavy
              </option>
            </Form.Select>
          </Form.Group>

          <Alert
            variant="light"
            className="small"
          >
            Your cycle length will be
            automatically calculated when
            enough previous period records are
            available.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() =>
              setShowPeriodModal(false)
            }
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
                <Spinner
                  size="sm"
                  className="me-2"
                />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Period
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
        onHide={() =>
          !saving &&
          setShowLogModal(false)
        }
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            📝 Wellness Log
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-4">
            <Form.Label>
              Date
            </Form.Label>

            <Form.Control
              type="date"
              value={logDate}
              onChange={(e) =>
                setLogDate(
                  e.target.value
                )
              }
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Symptoms
            </Form.Label>

            <div className="d-flex flex-wrap gap-2">
              {symptomOptions.map(
                (symptom) => (
                  <Button
                    key={symptom}
                    size="sm"
                    variant={
                      selectedSymptoms.includes(
                        symptom
                      )
                        ? "primary"
                        : "light"
                    }
                    onClick={() =>
                      toggleSymptom(
                        symptom
                      )
                    }
                    style={{
                      borderRadius:
                        "20px",
                    }}
                  >
                    {symptom}
                  </Button>
                )
              )}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Mood
            </Form.Label>

            <div className="d-flex flex-wrap gap-2">
              {moodOptions.map(
                (item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={
                      mood === item
                        ? "dark"
                        : "light"
                    }
                    onClick={() =>
                      setMood(item)
                    }
                    style={{
                      borderRadius:
                        "20px",
                    }}
                  >
                    {item}
                  </Button>
                )
              )}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Pain Level:{" "}
              <strong>
                {painLevel}/10
              </strong>
            </Form.Label>

            <Form.Range
              min={0}
              max={10}
              value={painLevel}
              onChange={(e) =>
                setPainLevel(
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </Form.Group>

          <Form.Group>
            <Form.Label className="fw-semibold">
              Notes
            </Form.Label>

            <Form.Control
              as="textarea"
              rows={4}
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="How are you feeling today?"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() =>
              setShowLogModal(false)
            }
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
                <Spinner
                  size="sm"
                  className="me-2"
                />
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
        onHide={() =>
          !saving &&
          setShowSettingsModal(false)
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            ⚙️ Cycle Settings
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Calculation Mode
            </Form.Label>

            <div className="d-flex gap-2">
              <Button
                className="flex-fill"
                variant={
                  calculationMode ===
                  "automatic"
                    ? "primary"
                    : "light"
                }
                onClick={() =>
                  setCalculationMode(
                    "automatic"
                  )
                }
              >
                Automatic
              </Button>

              <Button
                className="flex-fill"
                variant={
                  calculationMode ===
                  "manual"
                    ? "primary"
                    : "light"
                }
                onClick={() =>
                  setCalculationMode(
                    "manual"
                  )
                }
              >
                Manual
              </Button>
            </div>
          </Form.Group>

          {calculationMode ===
            "automatic" && (
            <Alert
              variant="info"
              className="small"
            >
              Current automatic average:
              <strong>
                {" "}
                {automaticCycleLength}{" "}
                days
              </strong>
            </Alert>
          )}

          {calculationMode ===
            "manual" && (
            <Form.Group className="mb-3">
              <Form.Label>
                Cycle Length
              </Form.Label>

              <Form.Control
                type="number"
                min={15}
                max={60}
                value={
                  manualCycleLength
                }
                onChange={(e) =>
                  setManualCycleLength(
                    Math.min(
                      60,
                      Math.max(
                        15,
                        Number(
                          e.target.value
                        )
                      )
                    )
                  )
                }
              />

              <Form.Text>
                Usually entered between 15
                and 60 days.
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-4">
            <Form.Label>
              Period Duration
            </Form.Label>

            <Form.Control
              type="number"
              min={1}
              max={15}
              value={periodDuration}
              onChange={(e) =>
                setPeriodDuration(
                  Math.min(
                    15,
                    Math.max(
                      1,
                      Number(
                        e.target.value
                      )
                    )
                  )
                )
              }
            />

            <Form.Text>
              Number of days your period
              usually lasts.
            </Form.Text>
          </Form.Group>

          <hr />

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <div className="fw-semibold">
                <FaBell className="me-2" />
                Period Reminder
              </div>

              <small className="text-muted">
                Save reminder preference
                for future notification
                integration.
              </small>
            </div>

            <Form.Check
              type="switch"
              checked={
                reminderEnabled
              }
              onChange={(e) =>
                setReminderEnabled(
                  e.target.checked
                )
              }
            />
          </div>

          {reminderEnabled && (
            <Form.Group>
              <Form.Label>
                Remind me{" "}
                <strong>
                  {reminderDaysBefore}
                </strong>{" "}
                days before
              </Form.Label>

              <Form.Select
                value={
                  reminderDaysBefore
                }
                onChange={(e) =>
                  setReminderDaysBefore(
                    Number(
                      e.target.value
                    )
                  )
                }
              >
                <option value={1}>
                  1 day before
                </option>

                <option value={2}>
                  2 days before
                </option>

                <option value={3}>
                  3 days before
                </option>

                <option value={5}>
                  5 days before
                </option>

                <option value={7}>
                  7 days before
                </option>
              </Form.Select>
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            disabled={saving}
            onClick={() =>
              setShowSettingsModal(false)
            }
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
                <Spinner
                  size="sm"
                  className="me-2"
                />
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

