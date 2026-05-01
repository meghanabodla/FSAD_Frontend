const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const TOKEN_KEY = "assignment_token";
const USER_KEY = "assignment_user";
const MOCK_DB_KEY = "assignment_mock_db";

function createMockDb() {
  return {
    users: [],
    assignments: [],
    submissions: [],
    nextIds: {
      user: 1,
      assignment: 1,
      submission: 1
    }
  };
}

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getMockDb() {
  const db = readJson(MOCK_DB_KEY, null);
  if (db) {
    return db;
  }

  const initialDb = createMockDb();
  writeJson(MOCK_DB_KEY, initialDb);
  return initialDb;
}

function saveMockDb(db) {
  writeJson(MOCK_DB_KEY, db);
}

function makeId(db, type) {
  const value = db.nextIds[type];
  db.nextIds[type] += 1;
  return value;
}

function normalizeRole(role) {
  return role === "TEACHER" ? "TEACHER" : "STUDENT";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isDeadlinePassed(deadline) {
  return new Date(deadline).getTime() < Date.now();
}

function createToken(user) {
  return `mock-token-${user.id}-${Date.now()}`;
}

function makeAuthResponse(user) {
  return {
    token: createToken(user),
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(authResponse) {
  if (authResponse.token) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: authResponse.userId,
      name: authResponse.name,
      email: authResponse.email,
      role: authResponse.role
    })
  );
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function parseMockBody(body) {
  if (!body) {
    return {};
  }

  if (body instanceof FormData) {
    const metadataField = body.get("metadata");
    let metadata = {};

    if (typeof metadataField === "string") {
      metadata = JSON.parse(metadataField);
    } else if (metadataField && typeof metadataField.text === "function") {
      metadata = JSON.parse(await metadataField.text());
    }

    const file = body.get("file");
    return { ...metadata, file };
  }

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body;
}

function getCurrentMockUser(db) {
  const sessionUser = getCurrentUser();
  if (!sessionUser) {
    throw new Error("Please login to continue");
  }

  const user = db.users.find((item) => item.id === sessionUser.id);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

function getStudents(db) {
  return db.users.filter((user) => user.role === "STUDENT");
}

function serializeAssignmentForTeacher(db, assignment) {
  const submissions = db.submissions.filter((item) => item.assignmentId === assignment.id);
  const totalStudents = getStudents(db).length;
  const pendingCount = Math.max(totalStudents - submissions.length, 0);
  const gradedCount = submissions.filter((item) => item.graded).length;
  const ungradedCount = submissions.length - gradedCount;

  return {
    ...clone(assignment),
    status: isDeadlinePassed(assignment.deadline) ? "CLOSED" : "ACTIVE",
    submissionCount: submissions.length,
    pendingCount,
    gradedCount,
    ungradedCount
  };
}

function serializeSubmission(submission) {
  return clone({
    ...submission,
    uploadedFileData: undefined,
    uploadedFileType: undefined
  });
}

function serializeAssignmentForStudent(db, assignment, student) {
  const submission = db.submissions.find(
    (item) => item.assignmentId === assignment.id && item.studentId === student.id
  );

  return {
    ...clone(assignment),
    mySubmission: submission
      ? {
          ...serializeSubmission(submission),
          canModify: !submission.graded && !isDeadlinePassed(assignment.deadline)
        }
      : null
  };
}

function getTeacherDashboard(db) {
  const teacher = getCurrentMockUser(db);
  if (teacher.role !== "TEACHER") {
    throw new Error("Teacher access required");
  }

  const assignments = db.assignments
    .filter((assignment) => assignment.createdBy === teacher.id)
    .map((assignment) => serializeAssignmentForTeacher(db, assignment));

  return {
    totalAssignments: assignments.length,
    activeAssignments: assignments.filter((item) => item.status === "ACTIVE").length,
    closedAssignments: assignments.filter((item) => item.status === "CLOSED").length,
    totalSubmissions: assignments.reduce((total, item) => total + (item.submissionCount || 0), 0),
    assignments
  };
}

function getStudentDashboard(db) {
  const student = getCurrentMockUser(db);
  if (student.role !== "STUDENT") {
    throw new Error("Student access required");
  }

  const assignments = db.assignments.map((assignment) =>
    serializeAssignmentForStudent(db, assignment, student)
  );
  const gradedSubmissions = db.submissions.filter(
    (item) => item.studentId === student.id && item.graded && typeof item.grade === "number"
  );
  const grades = gradedSubmissions.map((item) => item.grade);

  return {
    totalAttempts: db.submissions.filter((item) => item.studentId === student.id).length,
    averageScore: grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0,
    highestScore: grades.length ? Math.max(...grades) : 0,
    lowestScore: grades.length ? Math.min(...grades) : 0,
    upcomingDeadlines: assignments
      .filter((item) => {
        const deadline = new Date(item.deadline).getTime();
        return deadline > Date.now() && deadline - Date.now() <= 1000 * 60 * 60 * 24 * 3;
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3),
    assignments
  };
}

async function toDataUrl(file) {
  if (!file) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function scoreMcqSubmission(assignment, answers) {
  return (assignment.questions || []).reduce((score, question, index) => {
    const answer = answers[index];
    return answer && answer === question.correctAnswer
      ? score + Number(question.marks || 1)
      : score;
  }, 0);
}

async function handleMockRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = await parseMockBody(options.body);
  const db = getMockDb();

  if (path === "/auth/register" && method === "POST") {
    const { name, email, password, role } = body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!name?.trim() || !normalizedEmail || !password?.trim() || !role) {
      throw new Error("Please fill all required fields");
    }

    if (db.users.some((user) => user.email === normalizedEmail)) {
      throw new Error("Email already registered");
    }

    const user = {
      id: makeId(db, "user"),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: normalizeRole(role)
    };
    db.users.push(user);
    saveMockDb(db);

    return "Registration successful. Please login.";
  }

  if (path === "/auth/login" && method === "POST") {
    const normalizedEmail = body.email?.trim().toLowerCase();
    const user = db.users.find(
      (item) => item.email === normalizedEmail && item.password === body.password
    );

    if (!user) {
      throw new Error("Authentication failed");
    }

    return makeAuthResponse(user);
  }

  if (path === "/teacher/dashboard" && method === "GET") {
    return getTeacherDashboard(db);
  }

  if (path === "/student/dashboard" && method === "GET") {
    return getStudentDashboard(db);
  }

  if (path === "/teacher/assignments" && method === "POST") {
    const teacher = getCurrentMockUser(db);
    if (teacher.role !== "TEACHER") {
      throw new Error("Teacher access required");
    }

    const assignment = {
      id: makeId(db, "assignment"),
      title: body.title?.trim(),
      description: body.description?.trim() || "",
      type: body.type || "TEXT",
      deadline: body.deadline,
      durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : null,
      totalMarks: Number(body.totalMarks || 100),
      questions: clone(body.questions || []),
      createdBy: teacher.id,
      createdAt: new Date().toISOString()
    };

    db.assignments.push(assignment);
    saveMockDb(db);
    return serializeAssignmentForTeacher(db, assignment);
  }

  const teacherAssignmentMatch = path.match(/^\/teacher\/assignments\/(\d+)$/);
  if (teacherAssignmentMatch && method === "PUT") {
    const assignmentId = Number(teacherAssignmentMatch[1]);
    const teacher = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);

    if (!assignment || assignment.createdBy !== teacher.id) {
      throw new Error("Assignment not found");
    }

    assignment.title = body.title?.trim();
    assignment.description = body.description?.trim() || "";
    assignment.type = body.type || assignment.type;
    assignment.deadline = body.deadline;
    assignment.durationMinutes = body.durationMinutes ? Number(body.durationMinutes) : null;
    assignment.totalMarks = Number(body.totalMarks || assignment.totalMarks || 100);
    assignment.questions = clone(body.questions || []);
    saveMockDb(db);
    return serializeAssignmentForTeacher(db, assignment);
  }

  if (teacherAssignmentMatch && method === "DELETE") {
    const assignmentId = Number(teacherAssignmentMatch[1]);
    const teacher = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);

    if (!assignment || assignment.createdBy !== teacher.id) {
      throw new Error("Assignment not found");
    }

    db.assignments = db.assignments.filter((item) => item.id !== assignmentId);
    db.submissions = db.submissions.filter((item) => item.assignmentId !== assignmentId);
    saveMockDb(db);
    return { success: true };
  }

  const teacherSubmissionsMatch = path.match(/^\/teacher\/assignments\/(\d+)\/submissions$/);
  if (teacherSubmissionsMatch && method === "GET") {
    const assignmentId = Number(teacherSubmissionsMatch[1]);
    const teacher = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);

    if (!assignment || assignment.createdBy !== teacher.id) {
      throw new Error("Assignment not found");
    }

    return db.submissions
      .filter((item) => item.assignmentId === assignmentId)
      .map((item) => serializeSubmission(item));
  }

  const gradeMatch = path.match(/^\/teacher\/submissions\/(\d+)\/grade$/);
  if (gradeMatch && method === "PUT") {
    const teacher = getCurrentMockUser(db);
    const submissionId = Number(gradeMatch[1]);
    const submission = db.submissions.find((item) => item.id === submissionId);
    const assignment = db.assignments.find((item) => item.id === submission?.assignmentId);

    if (!submission || !assignment || assignment.createdBy !== teacher.id) {
      throw new Error("Submission not found");
    }

    submission.grade = typeof body.grade === "number" ? body.grade : submission.grade ?? 0;
    submission.remarks = body.remarks || "";
    submission.graded = true;
    saveMockDb(db);
    return serializeSubmission(submission);
  }

  const studentSubmissionMatch = path.match(/^\/student\/assignments\/(\d+)\/submission$/);
  if (studentSubmissionMatch && method === "GET") {
    const assignmentId = Number(studentSubmissionMatch[1]);
    const student = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);
    const submission = db.submissions.find(
      (item) => item.assignmentId === assignmentId && item.studentId === student.id
    );

    if (!assignment || !submission) {
      throw new Error("Submission not found");
    }

    return {
      ...serializeSubmission(submission),
      canModify: !submission.graded && !isDeadlinePassed(assignment.deadline)
    };
  }

  const submitMatch = path.match(/^\/student\/assignments\/(\d+)\/submit$/);
  if (submitMatch && method === "POST") {
    const assignmentId = Number(submitMatch[1]);
    const student = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (isDeadlinePassed(assignment.deadline)) {
      throw new Error("Deadline passed");
    }

    let submission = db.submissions.find(
      (item) => item.assignmentId === assignmentId && item.studentId === student.id
    );
    const fileData = await toDataUrl(body.file);

    if (!submission) {
      submission = {
        id: makeId(db, "submission"),
        assignmentId,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email
      };
      db.submissions.push(submission);
    }

    submission.textAnswer = body.textAnswer || "";
    submission.mcqAnswers = clone(body.mcqAnswers || []);
    submission.submittedAt = new Date().toISOString();
    submission.remarks = submission.remarks || "";

    if (fileData) {
      submission.uploadedFileData = fileData;
      submission.uploadedFileName = body.file.name;
      submission.uploadedFileType = body.file.type;
    }

    if (assignment.type === "MCQ") {
      submission.grade = scoreMcqSubmission(assignment, submission.mcqAnswers);
      submission.remarks = "Auto-graded MCQ submission";
      submission.graded = true;
    } else {
      submission.graded = false;
      if (typeof submission.grade !== "number") {
        submission.grade = null;
      }
    }

    saveMockDb(db);
    return serializeSubmission(submission);
  }

  if (studentSubmissionMatch && method === "DELETE") {
    const assignmentId = Number(studentSubmissionMatch[1]);
    const student = getCurrentMockUser(db);
    const assignment = db.assignments.find((item) => item.id === assignmentId);
    const submission = db.submissions.find(
      (item) => item.assignmentId === assignmentId && item.studentId === student.id
    );

    if (!assignment || !submission) {
      throw new Error("Submission not found");
    }

    if (submission.graded || isDeadlinePassed(assignment.deadline)) {
      throw new Error("Submission can no longer be modified");
    }

    db.submissions = db.submissions.filter((item) => item.id !== submission.id);
    saveMockDb(db);
    return { success: true };
  }

  const fileMatch = path.match(/^\/files\/submissions\/(\d+)$/);
  if (fileMatch && method === "GET") {
    const submissionId = Number(fileMatch[1]);
    const submission = db.submissions.find((item) => item.id === submissionId);

    if (!submission?.uploadedFileData) {
      throw new Error("File not found");
    }

    return {
      fileName: submission.uploadedFileName,
      dataUrl: submission.uploadedFileData
    };
  }

  throw new Error(`Mock API route not implemented: ${method} ${path}`);
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestOptions = {
    ...options,
    headers
  };

  if (!import.meta.env.VITE_API_BASE_URL) {
    return handleMockRequest(path, requestOptions);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, requestOptions);
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot reach backend API. Check that the backend is running and VITE_API_BASE_URL is correct.");
    }

    throw error;
  }
}

export async function apiJson(path, method, body) {
  return apiRequest(path, {
    method,
    body: JSON.stringify(body)
  });
}

export async function apiMultipart(path, method, metadata, file) {
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );

  if (file) {
    formData.append("file", file);
  }

  return apiRequest(path, {
    method,
    body: formData
  });
}

export async function openProtectedFile(path) {
  if (!import.meta.env.VITE_API_BASE_URL) {
    const response = await handleMockRequest(path, { method: "GET" });
    window.open(response.dataUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const token = getToken();
  const response = await fetch(`${API_BASE_}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Unable to open file");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}
