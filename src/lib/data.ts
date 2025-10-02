
'use server';
import 'server-only';
import { getFirebaseAdmin } from '@/lib/firebase';
import { User, Training, Assignment, TrainingStatus, PopulatedAssignment, UserCategory } from './types';
import type { Firestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Helper to convert Firestore doc to a specific type
function docToData<T>(doc: FirebaseFirestore.DocumentSnapshot): T {
  const data = doc.data();
  return { ...data, id: doc.id } as T;
}

// --- USER FUNCTIONS ---

export const authenticateUser = async (email: string, pass: string): Promise<{ user: User | null, error?: string }> => {
  console.log("--- AUTHENTICATE USER: START ---");
  
  try {
    const { db } = getFirebaseAdmin();
    
    // Get all users and filter in memory to avoid query index issue.
    // This is not scalable for a large number of users, but will unblock the app.
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
        console.log("--- AUTHENTICATE USER: NO USERS FOUND IN COLLECTION ---");
        // If no users exist, seed the first one
        const initialPassword = "password"; 
        const initialUser = {
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin' as 'admin',
            avatarUrl: 'https://placehold.co/100x100.png',
            passwordHash: initialPassword, 
            categories: ['Supervisión', 'Línea de Mando (FC)'] as UserCategory[],
        };
        // Use hardcoded admin credentials for the very first login if the DB is empty
        if (email.toLowerCase() === initialUser.email && pass === initialPassword) {
            const docRef = await db.collection('users').add(initialUser);
            console.log("Initial admin user created.");
            const newUser = { ...initialUser, id: docRef.id };
             // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, ...userWithoutPassword } = newUser;
            return { user: userWithoutPassword as User };
        } else {
            return { user: null, error: "Credenciales inválidas o el usuario no existe." };
        }
    }

    const users = snapshot.docs.map(doc => docToData<User>(doc));
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log("--- AUTHENTICATE USER: USER NOT FOUND ---");
      return { user: null, error: "Credenciales inválidas o el usuario no existe." };
    }
    
    if (!user.passwordHash) {
       console.log("--- AUTHENTICATE USER: NO PASSWORD HASH ---");
       return { user: null, error: "El usuario no tiene una contraseña configurada." };
    }

    const isPasswordValid = user.passwordHash === pass;
    
    if (!isPasswordValid) {
      console.log("--- AUTHENTICATE USER: INVALID PASSWORD ---");
      return { user: null, error: "Credenciales inválidas." };
    }
    
    console.log("--- AUTHENTICATE USER: SUCCESS ---");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword as User };
  } catch (error) {
    console.error("--- AUTHENTICATE USER: CRITICAL ERROR ---", error);
    if (error instanceof Error) {
        if (error.message.includes('Firebase Admin SDK is not initialized')) {
             return { user: null, error: "Error de configuración del servidor. No se pudo conectar a la base de datos." };
        }
        return { user: null, error: `Error: ${error.message}`};
    }
    return { user: null, error: "Ocurrió un error inesperado durante la autenticación." };
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const { db } = getFirebaseAdmin();
  if (!db) return null;

  try {
    const docRef = db.collection('users').doc(userId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const user = docToData<User>(docSnap);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by ID ${userId}:`, error);
    return null;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
    const { db } = getFirebaseAdmin();
    if (!db) return null;

    const usersRef = db.collection('users');
    const q = usersRef.where('email', '==', email.toLowerCase());
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        return null;
    }
    return docToData<User>(querySnapshot.docs[0]);
}

export const createUser = async (name: string, email: string, password: string, role: 'admin' | 'user', categories: UserCategory[] = []): Promise<string> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for createUser.");

    const newUser = {
        name,
        email: email.toLowerCase(),
        role,
        avatarUrl: 'https://placehold.co/100x100.png',
        passwordHash: password,
        categories: categories,
    };
    const docRef = await db.collection('users').add(newUser);
    return docRef.id;
};

export const promoteUser = async (userId: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for promoteUser.");

    const userRef = db.collection('users').doc(userId);
    await userRef.update({ role: 'admin' });
};

export const deleteUser = async (userId: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for deleteUser.");

    const batch = db.batch();

    const userRef = db.collection('users').doc(userId);
    batch.delete(userRef);

    const assignmentsRef = db.collection('assignments');
    const q = assignmentsRef.where('userId', '==', userId);
    const assignmentsSnapshot = await q.get();
    assignmentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

export const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for updateUserPassword.");

    const userRef = db.collection('users').doc(userId);
    await userRef.update({ passwordHash: newPassword });
};

// --- TRAINING FUNCTIONS ---

export const getAllTrainings = async (): Promise<Training[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];
    try {
        const querySnapshot = await db.collection('trainings').orderBy('title').get();
        return querySnapshot.docs.map(doc => docToData<Training>(doc));
    } catch (error) {
        console.error("Error fetching all trainings: ", error);
        return [];
    }
};

export const createTraining = async (trainingData: Omit<Training, 'id'>): Promise<string> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for createTraining.");

    const docRef = await db.collection('trainings').add(trainingData);
    return docRef.id;
};

export const updateTraining = async (trainingId: string, trainingData: Partial<Omit<Training, 'id'>>): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for updateTraining.");

    const trainingRef = db.collection('trainings').doc(trainingId);
    await trainingRef.update(trainingData);
}

export const deleteTraining = async (trainingId: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for deleteTraining.");
    
    const batch = db.batch();

    const trainingRef = db.collection('trainings').doc(trainingId);
    batch.delete(trainingRef);

    const assignmentsRef = db.collection('assignments');
    const q = assignmentsRef.where('trainingId', '==', trainingId);
    const assignmentsSnapshot = await q.get();
    assignmentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// --- ASSIGNMENT FUNCTIONS ---
export const getTrainingsForUser = async (userId: string): Promise<PopulatedAssignment[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];

    try {
        const assignmentsRef = db.collection('assignments');
        const q = assignmentsRef.where('userId', '==', userId);
        const assignmentsSnapshot = await q.get();

        if (assignmentsSnapshot.empty) {
            return [];
        }

        const assignments = assignmentsSnapshot.docs.map(doc => docToData<Assignment>(doc));
        const trainingIds = [...new Set(assignments.map(a => a.trainingId))];

        if (trainingIds.length === 0) {
            return [];
        }
        
        const trainingsRef = db.collection('trainings');
        const trainingsQuery = await trainingsRef.where(admin.firestore.FieldPath.documentId(), 'in', trainingIds).get();
        const trainingsMap = new Map(trainingsQuery.docs.map(doc => [doc.id, docToData<Training>(doc)]));

        return assignments.map(assignment => {
            const trainingDetails = trainingsMap.get(assignment.trainingId);
            if (!trainingDetails) return null;
            return {
                ...trainingDetails,
                assignmentId: assignment.id,
                status: assignment.status,
                userId: assignment.userId,
                assignedDate: assignment.assignedDate,
                completedDate: assignment.completedDate,
            };
        }).filter((a): a is PopulatedAssignment => a !== null);
    } catch (error) {
        console.error(`Error fetching trainings for user ${userId}:`, error);
        return [];
    }
};


export const updateAssignmentStatus = async (assignmentId: string, status: TrainingStatus): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for updateAssignmenteStatus.");

    const assignmentRef = db.collection('assignments').doc(assignmentId);
    const updateData: any = { status };
    if (status === 'completed') {
        updateData.completedDate = new Date().toISOString();
    } else {
        updateData.completedDate = null;
    }
    await assignmentRef.update(updateData);
};

export const assignTrainingToUser = async (trainingId: string, userId: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for assignTrainingToUser.");

    const assignmentsRef = db.collection('assignments');
    const q = assignmentsRef.where('userId', '==', userId).where('trainingId', '==', trainingId);
    const existing = await q.get();

    if (!existing.empty) {
      console.log(`Assignment already exists for user ${userId} and training ${trainingId}`);
      return;
    }

    await assignmentsRef.add({
        userId,
        trainingId,
        status: 'pending',
        assignedDate: new Date().toISOString(),
        completedDate: null,
    });
};

export const assignTrainingToUsers = async (trainingId: string, userIds: string[]): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for assignTrainingToUsers.");
    
    const assignmentsRef = db.collection('assignments');
    
    // Get existing assignments for this training to avoid duplicates
    const existingAssignmentsSnap = await assignmentsRef.where('trainingId', '==', trainingId).get();
    const existingUserIds = new Set(existingAssignmentsSnap.docs.map(doc => doc.data().userId));

    const batch = db.batch();
    const userIdsToAssign = userIds.filter(id => !existingUserIds.has(id));

    for (const userId of userIdsToAssign) {
      const newAssignmentRef = db.collection("assignments").doc();
      batch.set(newAssignmentRef, {
        userId,
        trainingId,
        status: 'pending',
        assignedDate: new Date().toISOString(),
        completedDate: null,
      });
    }

    if (userIdsToAssign.length > 0) {
        await batch.commit();
    }
};


export const getAssignmentsForTraining = async (trainingId:string): Promise<Assignment[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];

    const assignmentsRef = db.collection('assignments');
    const q = assignmentsRef.where('trainingId', '==', trainingId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => docToData<Assignment>(doc));
}

export const getAllUsers = async (): Promise<User[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];
    
    try {
        const usersSnap = await db.collection('users').get();
        
        if (usersSnap.empty) {
            console.log("No users found. Seeding initial admin user...");
            const initialPassword = "password"; 
            const initialUser = {
                name: 'Admin',
                email: 'admin@example.com',
                role: 'admin' as 'admin',
                avatarUrl: 'https://placehold.co/100x100.png',
                passwordHash: initialPassword, 
                categories: ['Supervisión', 'Línea de Mando (FC)'] as UserCategory[],
            };
            const docRef = await db.collection('users').add(initialUser);
            console.log("Initial admin user created.");
            const newUserSnap = await docRef.get();
            const newUser = docToData<User>(newUserSnap);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, ...userWithoutPassword } = newUser;
            return [userWithoutPassword as User];
        }
        
        return usersSnap.docs.map(doc => {
            const user = docToData<User>(doc);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword as User;
        });
    } catch(error) {
        console.error("Error fetching all users:", error);
        return [];
    }
}

export const getAllAssignments = async (): Promise<Assignment[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];
    try {
        const assignmentsSnap = await db.collection('assignments').get();
        return assignmentsSnap.docs.map(doc => docToData<Assignment>(doc));
    } catch (error) {
        console.error("Error fetching all assignments:", error);
        return [];
    }
}
    
