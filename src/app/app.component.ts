import { Component } from '@angular/core';
import { Task } from './task/task';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { TaskDialogResult, TaskDialogComponent } from './task-dialog/task-dialog.component';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject([]);
  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'fire-app';
  todo = getObservable(this.store.collection('todo'));
  inProgress = this.store.collection('inProgress').valueChanges({ idField: 'id' });
  done = this.store.collection('done').valueChanges({ idField: 'id' });
  
  constructor(private dialog: MatDialog, private store: AngularFirestore) {}
  
  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });
    dialogRef
      .afterClosed()
      //.subscribe((result: TaskDialogResult) => this.todo.push(result.task));
      .subscribe((result: TaskDialogResult) => this.store.collection('todo').add(result.task));
  }
  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      const promise = Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item),
      ]);
      return promise;
    });
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
 editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
  const dialogRef = this.dialog.open(TaskDialogComponent, {
    width: '270px',
    data: {
      task,
      enableDelete: true,
    },
  });

  
  dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
    if (result.delete) {
      this.store.collection(list).doc(task.id).delete();
    } else {
      this.store.collection(list).doc(task.id).update(task);
    }
  });
}
}