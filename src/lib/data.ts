





'use server';
import 'server-only';
import { getFirebaseAdmin } from '@/lib/firebase';
import { User, Training, Assignment, TrainingStatus, PopulatedAssignment, UserCategory } from './types';
import type { Firestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { addDays, isPast } from 'date-fns';

// Helper to convert Firestore doc to a specific type
function docToData<T>(doc: FirebaseFirestore.DocumentSnapshot): T {
  const data = doc.data();
  return { ...data, id: doc.id } as T;
}

// --- USER FUNCTIONS ---

export const authenticateUser = async (identifier: string, pass: string): Promise<{ user: User | null, error?: string }> => {
  console.log("--- AUTHENTICATE USER: START ---");
  const identifierLower = identifier.toLowerCase();
  
  try {
    const { db } = getFirebaseAdmin();
    
    const usersRef = db.collection('users');
    // Query for username OR email. Firestore doesn't support OR queries on different fields.
    // We have to perform two separate queries.
    const usernameQuery = usersRef.where('username', '==', identifierLower).get();
    const emailQuery = usersRef.where('email', '==', identifierLower).get();
    
    const [usernameSnapshot, emailSnapshot] = await Promise.all([usernameQuery, emailQuery]);

    let userDoc: FirebaseFirestore.DocumentSnapshot | undefined;

    if (!usernameSnapshot.empty) {
        userDoc = usernameSnapshot.docs[0];
    } else if (!emailSnapshot.empty) {
        userDoc = emailSnapshot.docs[0];
    }

    if (!userDoc) {
        const snapshot = await usersRef.get();
        if (snapshot.empty) {
            console.log("--- AUTHENTICATE USER: NO USERS FOUND IN COLLECTION, SEEDING ADMIN ---");
            const initialPassword = "password"; 
            const initialUser = {
                name: 'Admin',
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin' as 'admin',
                avatarUrl: 'https://placehold.co/100x100.png',
                passwordHash: initialPassword, 
                categories: ['Supervisión', 'Línea de Mando (FC)'] as UserCategory[],
            };
            if (identifierLower === initialUser.email || identifierLower === initialUser.username) {
                 if(pass === initialPassword) {
                    const docRef = await db.collection('users').add(initialUser);
                    console.log("Initial admin user created.");
                    const newUser = { ...initialUser, id: docRef.id };
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { passwordHash, ...userWithoutPassword } = newUser;
                    return { user: userWithoutPassword as User };
                 }
            }
             return { user: null, error: "Credenciales inválidas o el usuario no existe." };
        }

        console.log("--- AUTHENTICATE USER: USER NOT FOUND ---");
        return { user: null, error: "Credenciales inválidas o el usuario no existe." };
    }
    
    const user = docToData<User>(userDoc);

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
    if (!email) return null;
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

export const findUserByUsername = async (username: string): Promise<User | null> => {
    const { db } = getFirebaseAdmin();
    if (!db) return null;

    const usersRef = db.collection('users');
    const q = usersRef.where('username', '==', username.toLowerCase());
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        return null;
    }
    return docToData<User>(querySnapshot.docs[0]);
}

export const createUser = async (data: Omit<User, 'id' | 'avatarUrl' | 'passwordHash'> & { password?: string }): Promise<string> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for createUser.");

    const newUser = {
        ...data,
        username: data.username.toLowerCase(),
        email: data.email ? data.email.toLowerCase() : '',
        avatarUrl: 'https://placehold.co/100x100.png',
        passwordHash: data.password,
    };
    const docRef = await db.collection('users').add(newUser);
    return docRef.id;
};

export const updateUserData = async (userId: string, data: Partial<Pick<User, 'name' | 'username' | 'email' | 'role' | 'categories'>>): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for updateUserData.");

    const updateData: Partial<User> = { ...data };
    if(data.username) updateData.username = data.username.toLowerCase();
    if(data.email) updateData.email = data.email.toLowerCase();


    const userRef = db.collection('users').doc(userId);
await userRef.update(updateData as { [key: string]: any });
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

export const getTrainingsByTrainerName = async (trainerName: string): Promise<Training[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];
    try {
        // This function is complex now. We need to find assignments for the trainer, then get unique trainings.
        const assignmentsRef = db.collection('assignments');
        const assignmentQuery = assignmentsRef.where('trainerName', '==', trainerName);
        const assignmentSnap = await assignmentQuery.get();
        if (assignmentSnap.empty) {
            return [];
        }

        const trainingIds = [...new Set(assignmentSnap.docs.map(doc => doc.data().trainingId))];

        if (trainingIds.length === 0) {
            return [];
        }

        const trainingsRef = db.collection('trainings');
        const trainingsQuery = await trainingsRef.where(admin.firestore.FieldPath.documentId(), 'in', trainingIds).get();
        
        return trainingsQuery.docs.map(doc => docToData<Training>(doc));
    } catch (error) {
        console.error(`Error fetching trainings for trainer ${trainerName}:`, error);
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
export const getAssignmentsForUser = async(userId: string): Promise<Assignment[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];

    const assignmentsRef = db.collection('assignments');
    const q = assignmentsRef.where('userId', '==', userId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => docToData<Assignment>(doc));
}

export const getTrainingsForUser = async (userId: string): Promise<PopulatedAssignment[]> => {
    const { db } = getFirebaseAdmin();
    if (!db) return [];

    try {
        const assignments = await getAssignmentsForUser(userId);

        if (assignments.length === 0) {
            return [];
        }

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

            let effectiveStatus: TrainingStatus = assignment.status;

            // Check for expiration
            if (assignment.status === 'completed' && trainingDetails.validityDays && assignment.completedDate) {
                const completionDate = new Date(assignment.completedDate);
                const expirationDate = addDays(completionDate, trainingDetails.validityDays);
                if (isPast(expirationDate)) {
                    effectiveStatus = 'pending'; // Treat as pending if expired, for renewal
                }
            }

            return {
                ...trainingDetails,
                ...assignment,
                assignmentId: assignment.id,
                effectiveStatus: effectiveStatus,
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
        // We don't nullify completedDate on purpose, to keep the history.
        // A new completion will overwrite it.
    }
    await assignmentRef.update(updateData);
};

export const assignTrainingToUser = async (trainingId: string, userId: string, scheduledDate?: string, trainerName?: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for assignTrainingToUser.");

    const assignmentsRef = db.collection('assignments');
    // An assignment is unique per user, training.
    // If a user is already assigned a training, we shouldn't re-assign.
    const q = assignmentsRef.where('userId', '==', userId)
                            .where('trainingId', '==', trainingId);
    const existing = await q.get();

    if (!existing.empty) {
        const existingDocRef = existing.docs[0].ref;
        const updateData: any = {
            status: 'pending', // Reset status for re-assignment
        };
         if (scheduledDate) updateData.scheduledDate = scheduledDate;
         if (trainerName) updateData.trainerName = trainerName;
        await existingDocRef.update(updateData);
        console.log(`Assignment already exists for user ${userId} and training ${trainingId}. Updating and resetting status.`);
        return;
    }
    
    const newAssignment: Omit<Assignment, 'id'> = {
        userId,
        trainingId,
        status: 'pending',
        assignedDate: new Date().toISOString(),
        completedDate: null,
    };

    if (scheduledDate) newAssignment.scheduledDate = scheduledDate;
    if (trainerName) newAssignment.trainerName = trainerName;

    await assignmentsRef.add(newAssignment);
};

export const assignTrainingToUsers = async (trainingId: string, userIds: string[], scheduledDate?: string, trainerName?: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for assignTrainingToUsers.");
    
    const batch = db.batch();
    const assignmentsRef = db.collection('assignments');
    
    // Efficiently find all existing assignments for this training and users
    const existingAssignmentsQuery = assignmentsRef.where('trainingId', '==', trainingId).where('userId', 'in', userIds);
    const existingAssignmentsSnap = await existingAssignmentsQuery.get();
    const existingUserIds = new Set(existingAssignmentsSnap.docs.map(doc => doc.data().userId));

    for (const userId of userIds) {
        if (existingUserIds.has(userId)) {
            // This user already has an assignment for this training, update it
            const existingDoc = existingAssignmentsSnap.docs.find(doc => doc.data().userId === userId);
            if (existingDoc) {
                 const updateData: any = { status: 'pending' }; // Re-assigning means it's pending again
                 if (scheduledDate) updateData.scheduledDate = scheduledDate;
                 if (trainerName) updateData.trainerName = trainerName;
                 batch.update(existingDoc.ref, updateData);
            }
        } else {
            // This is a new assignment
            const newAssignmentRef = assignmentsRef.doc();
            const newAssignment: Omit<Assignment, 'id'> = {
                userId,
                trainingId,
                status: 'pending',
                assignedDate: new Date().toISOString(),
                completedDate: null,
            };
            if (scheduledDate) newAssignment.scheduledDate = scheduledDate;
            if (trainerName) newAssignment.trainerName = trainerName;
            
            batch.set(newAssignmentRef, newAssignment);
        }
    }

    if (userIds.length > 0) {
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
        const usersSnap = await db.collection('users').orderBy('name').get();
        
        if (usersSnap.empty) {
            console.log("No users found. Seeding initial admin user...");
            const initialPassword = "password"; 
            const initialUser = {
                name: 'Admin',
                username: 'admin',
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

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
    const { db } = getFirebaseAdmin();
    if (!db) throw new Error("Database not initialized for deleteAssignment.");

    const assignmentRef = db.collection('assignments').doc(assignmentId);
    await assignmentRef.delete();
};
